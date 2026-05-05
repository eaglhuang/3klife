'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const config = require('./project-config');

const QUEUE_DIR = path.join(config.paths.taskLocksDir, 'doc-id-registry-queue');
const STATE_FILE = path.join(QUEUE_DIR, 'state.json');
const MUTATION_LOCK_FILE = path.join(QUEUE_DIR, 'state.lock');
const ACTIVE_FILE = path.join(QUEUE_DIR, 'active.json');

const DEFAULTS = {
  pollMs: 80,
  heartbeatMs: 1000,
  staleMs: 30000,
};

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ticketFile(ticket) {
  return path.join(QUEUE_DIR, `ticket-${String(ticket).padStart(8, '0')}.json`);
}

async function ensureQueueDir() {
  await fsp.mkdir(QUEUE_DIR, { recursive: true });
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fsp.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function safeUnlink(filePath) {
  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function writeTextAtomic(filePath, content) {
  await ensureQueueDir();
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await fsp.writeFile(tempPath, content, 'utf8');
  await fsp.rename(tempPath, filePath);
}

async function writeJsonAtomic(filePath, value) {
  await writeTextAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function buildDefaultState() {
  return {
    nextTicket: 1,
    servingTicket: 1,
    updatedAt: nowIso(),
  };
}

async function readState() {
  const state = await readJsonIfExists(STATE_FILE);
  return {
    ...buildDefaultState(),
    ...(state || {}),
  };
}

function heartbeatAgeMs(record) {
  const stamp = record && (record.heartbeatAt || record.claimedAt || record.enqueuedAt || record.updatedAt);
  const parsed = Date.parse(stamp || '');
  if (!Number.isFinite(parsed)) {
    return Number.POSITIVE_INFINITY;
  }
  return Date.now() - parsed;
}

async function acquireFileLock(lockPath, options = {}) {
  const pollMs = options.pollMs ?? DEFAULTS.pollMs;
  const staleMs = options.staleMs ?? DEFAULTS.staleMs;

  await ensureQueueDir();

  while (true) {
    try {
      const handle = await fsp.open(lockPath, 'wx');
      const payload = {
        pid: process.pid,
        label: String(options.label || ''),
        createdAt: nowIso(),
      };
      await handle.writeFile(`${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      return async () => {
        try {
          await handle.close();
        } catch (_) {
          // ignore close failures during cleanup
        }
        await safeUnlink(lockPath);
      };
    } catch (error) {
      if (!error || error.code !== 'EEXIST') {
        throw error;
      }

      let stale = false;
      try {
        const stat = await fsp.stat(lockPath);
        stale = Date.now() - stat.mtimeMs > staleMs;
      } catch (statError) {
        if (statError && statError.code === 'ENOENT') {
          stale = false;
        } else {
          throw statError;
        }
      }

      if (stale) {
        await safeUnlink(lockPath);
        continue;
      }

      await sleep(pollMs + Math.floor(Math.random() * Math.max(20, pollMs / 2)));
    }
  }
}

async function mutateState(mutator, options = {}) {
  const release = await acquireFileLock(MUTATION_LOCK_FILE, {
    ...options,
    label: options.label || 'doc-id-registry-state-mutation',
  });
  try {
    const current = await readState();
    const next = await mutator({ ...current }) || current;
    next.updatedAt = nowIso();
    await writeJsonAtomic(STATE_FILE, next);
    return next;
  } finally {
    await release();
  }
}

async function writeTicketHeartbeat(ticket, meta, status, enqueuedAt) {
  await writeJsonAtomic(ticketFile(ticket), {
    ticket,
    pid: process.pid,
    request: meta,
    status,
    enqueuedAt,
    heartbeatAt: nowIso(),
  });
}

async function maybeRecoverStaleTurn(options = {}) {
  const staleMs = options.staleMs ?? DEFAULTS.staleMs;
  const state = await readState();
  const servingTicket = state.servingTicket || 1;
  const nextTicket = state.nextTicket || 1;
  if (nextTicket <= servingTicket) {
    return false;
  }

  const active = await readJsonIfExists(ACTIVE_FILE);
  let servingMeta = null;
  if (active && active.ticket === servingTicket) {
    servingMeta = active;
  } else {
    servingMeta = await readJsonIfExists(ticketFile(servingTicket));
  }

  if (!servingMeta || heartbeatAgeMs(servingMeta) <= staleMs) {
    return false;
  }

  const release = await acquireFileLock(MUTATION_LOCK_FILE, {
    ...options,
    label: 'doc-id-registry-stale-recovery',
  });
  try {
    const latestState = await readState();
    if ((latestState.servingTicket || 1) !== servingTicket) {
      return false;
    }

    const latestActive = await readJsonIfExists(ACTIVE_FILE);
    let latestServingMeta = null;
    if (latestActive && latestActive.ticket === servingTicket) {
      latestServingMeta = latestActive;
    } else {
      latestServingMeta = await readJsonIfExists(ticketFile(servingTicket));
    }

    if (!latestServingMeta || heartbeatAgeMs(latestServingMeta) <= staleMs) {
      return false;
    }

    latestState.servingTicket = servingTicket + 1;
    latestState.recoveredTicket = servingTicket;
    latestState.recoveredAt = nowIso();
    await writeJsonAtomic(STATE_FILE, latestState);
    if (latestActive && latestActive.ticket === servingTicket) {
      await safeUnlink(ACTIVE_FILE);
    }
    await safeUnlink(ticketFile(servingTicket));
    return true;
  } finally {
    await release();
  }
}

async function enqueueTicket(meta, options = {}) {
  await ensureQueueDir();

  let ticketInfo = null;
  await mutateState((state) => {
    const ticket = state.nextTicket || 1;
    const servingTicket = state.servingTicket || 1;
    ticketInfo = {
      ticket,
      queueDepth: Math.max(0, ticket - servingTicket),
      servingTicket,
    };
    state.nextTicket = ticket + 1;
    return state;
  }, {
    ...options,
    label: 'doc-id-registry-ticket-allocate',
  });

  const enqueuedAt = nowIso();
  await writeTicketHeartbeat(ticketInfo.ticket, meta, ticketInfo.queueDepth > 0 ? 'queued' : 'ready', enqueuedAt);
  return {
    ...ticketInfo,
    enqueuedAt,
  };
}

async function waitForTurn(ticketInfo, meta, options = {}) {
  const pollMs = options.pollMs ?? DEFAULTS.pollMs;
  const heartbeatMs = options.heartbeatMs ?? DEFAULTS.heartbeatMs;
  const staleMs = options.staleMs ?? DEFAULTS.staleMs;
  const waitStart = Date.now();
  let lastTicketTouch = 0;

  while (true) {
    await maybeRecoverStaleTurn(options);
    const state = await readState();
    const servingTicket = state.servingTicket || 1;
    const now = Date.now();
    if ((now - lastTicketTouch) >= heartbeatMs || servingTicket === ticketInfo.ticket) {
      await writeTicketHeartbeat(ticketInfo.ticket, meta, servingTicket === ticketInfo.ticket ? 'claiming' : 'queued', ticketInfo.enqueuedAt);
      lastTicketTouch = now;
    }

    if (servingTicket === ticketInfo.ticket) {
      const release = await acquireFileLock(MUTATION_LOCK_FILE, {
        ...options,
        label: 'doc-id-registry-ticket-claim',
      });
      let turnClaimed = false;
      let activePayload = null;
      try {
        const latestState = await readState();
        if ((latestState.servingTicket || 1) === ticketInfo.ticket) {
          const active = await readJsonIfExists(ACTIVE_FILE);
          if (!active || active.ticket === ticketInfo.ticket || heartbeatAgeMs(active) > staleMs) {
            activePayload = {
              ticket: ticketInfo.ticket,
              pid: process.pid,
              request: meta,
              claimedAt: nowIso(),
              heartbeatAt: nowIso(),
            };
            await writeJsonAtomic(ACTIVE_FILE, activePayload);
            turnClaimed = true;
          }
        }
      } finally {
        await release();
      }

      if (turnClaimed && activePayload) {
        const heartbeatTimer = setInterval(() => {
          writeJsonAtomic(ACTIVE_FILE, {
            ...activePayload,
            heartbeatAt: nowIso(),
          }).catch(() => {
            // Ignore heartbeat errors; the stale-recovery path will handle a dead writer.
          });
        }, heartbeatMs);
        heartbeatTimer.unref?.();

        return {
          ticket: ticketInfo.ticket,
          waitMs: Date.now() - waitStart,
          async release(outcome = 'completed') {
            clearInterval(heartbeatTimer);
            const releaseMutation = await acquireFileLock(MUTATION_LOCK_FILE, {
              ...options,
              label: 'doc-id-registry-ticket-release',
            });
            try {
              const latestState = await readState();
              if ((latestState.servingTicket || 1) <= ticketInfo.ticket) {
                latestState.servingTicket = ticketInfo.ticket + 1;
                latestState.lastCompletedTicket = ticketInfo.ticket;
                latestState.lastOutcome = outcome;
                latestState.lastCompletedAt = nowIso();
                await writeJsonAtomic(STATE_FILE, latestState);
              }
            } finally {
              await releaseMutation();
            }

            const active = await readJsonIfExists(ACTIVE_FILE);
            if (active && active.ticket === ticketInfo.ticket) {
              await safeUnlink(ACTIVE_FILE);
            }
            await safeUnlink(ticketFile(ticketInfo.ticket));
          },
        };
      }
    }

    await sleep(pollMs + Math.floor(Math.random() * Math.max(20, pollMs / 2)));
  }
}

async function runQueuedRegistryWrite(meta, work, options = {}) {
  const ticketInfo = await enqueueTicket(meta, options);
  if (ticketInfo.queueDepth > 0) {
    console.log(`[doc-id-queue] queued ticket=${ticketInfo.ticket} ahead=${ticketInfo.queueDepth}`);
  }

  const turn = await waitForTurn(ticketInfo, meta, options);
  if (turn.waitMs > 0 && ticketInfo.queueDepth > 0) {
    console.log(`[doc-id-queue] turn ticket=${ticketInfo.ticket} wait=${turn.waitMs}ms`);
  }

  let outcome = 'completed';
  try {
    return await work({
      ticket: ticketInfo.ticket,
      queueDepth: ticketInfo.queueDepth,
      waitMs: turn.waitMs,
    });
  } catch (error) {
    outcome = 'failed';
    throw error;
  } finally {
    await turn.release(outcome);
  }
}

module.exports = {
  QUEUE_DIR,
  STATE_FILE,
  ACTIVE_FILE,
  runQueuedRegistryWrite,
};