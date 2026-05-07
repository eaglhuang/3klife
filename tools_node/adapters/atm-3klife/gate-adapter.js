'use strict';

function isDelegatedProfile(profile) {
  return Boolean(profile && profile._delegated);
}

function normalizeCommandSpec(command, profileName, index) {
  if (Array.isArray(command)) {
    const [cmd, ...args] = command;
    return {
      id: `${profileName}-${String(index + 1).padStart(2, '0')}`,
      label: `${profileName} delegated step ${index + 1}`,
      cmd,
      args,
      priority: index + 1,
      failAction: 'block',
      description: ''
    };
  }

  if (typeof command === 'string') {
    return {
      id: `${profileName}-${String(index + 1).padStart(2, '0')}`,
      label: command,
      cmd: 'node',
      args: [command],
      priority: index + 1,
      failAction: 'block',
      description: ''
    };
  }

  const commandId = command.id || `${profileName}-${String(index + 1).padStart(2, '0')}`;
  return {
    id: commandId,
    label: command.label || command.title || commandId,
    cmd: command.cmd || command.command || 'node',
    args: Array.isArray(command.args) ? [...command.args] : Array.isArray(command.commandArgs) ? [...command.commandArgs] : [],
    priority: Number.isFinite(command.priority) ? command.priority : index + 1,
    failAction: command.failAction || 'block',
    description: command.description || command.summary || ''
  };
}

function expandDelegatedProfile(profile, profileName) {
  if (!isDelegatedProfile(profile)) {
    return [];
  }

  const commandSpecs = Array.isArray(profile.commands) && profile.commands.length > 0
    ? profile.commands
    : profile.command
      ? [{
        id: profile.commandId,
        label: profile.commandLabel,
        cmd: profile.command,
        args: Array.isArray(profile.args) ? profile.args : [],
        priority: profile.priority,
        failAction: profile.failAction,
        description: profile.description
      }]
      : profile._targetCommand
        ? [{
          id: profile.targetId,
          label: profile.targetLabel,
          cmd: profile._targetCommand,
          args: Array.isArray(profile._targetArgs) ? profile._targetArgs : [],
          priority: profile.priority,
          failAction: profile.failAction,
          description: profile.description
        }]
        : [];

  return commandSpecs
    .map((command, index) => normalizeCommandSpec(command, profileName, index))
    .sort((left, right) => left.priority - right.priority || left.label.localeCompare(right.label));
}

module.exports = {
  isDelegatedProfile,
  expandDelegatedProfile,
};