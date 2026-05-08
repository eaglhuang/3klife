import { UCUFLogger, LogCategory } from '../utils/UCUFLogger';

export interface NpcKeywordOption {
    keywordKey: string;
    label: string;
    fullLabel?: string | null;
    uiLabelMaxChars?: number | null;
    confidence: number;
    sourceRefs?: string[];
}

export interface NpcKeywordOptionsResponse {
    generalId: string;
    keywordVersion: string;
    categories: Record<string, NpcKeywordOption[]>;
}

export interface NpcContextOption {
    contextKey: string;
    label: string;
    sourceType: string;
    confidence: number;
    evidenceRefs: string[];
}

export interface NpcContextOptionsResponse {
    generalId: string;
    options: NpcContextOption[];
}

export interface NpcInteractionEventPayload {
    saveId: string;
    generalId: string;
    eventType: string;
    summary: string;
    keywords?: string[];
    playerAction?: string | null;
    generalReaction?: string | null;
    isMilestone?: boolean;
}

export interface NpcInteractionEventResponse {
    ok: boolean;
    eventId: string;
}

export interface NpcGeneralMemory {
    saveId: string;
    generalId: string;
    schemaVersion: number;
    shortTerm: string;
    longTerm: string;
    playerProfile: string;
    promises: string;
    lastCompressedIdx: number;
    uncompressedCount: number;
    lastCompressedAt?: string | null;
}

export interface NpcGeneralMemoryContext {
    saveId: string;
    shortTerm?: string | null;
    longTerm?: string | null;
    playerProfile?: string | null;
    promises?: string | null;
}

export interface NpcMemoryCompressRequest {
    saveId: string;
    generalId: string;
    force?: boolean;
}

export interface NpcMemoryWriteResponse {
    ok: boolean;
}

export type NpcDialogueLocale = 'zh-TW' | 'en' | 'ja';
export type NpcDialogueSpeechContextMode = 'life_chat' | 'encounter_speech' | 'inner_monologue' | 'meeting_statement';
export type NpcDialogueModelPreset = 'fallback_chain' | 'gemini_pro' | 'gemini_flash' | 'gemini_flash_lite' | 'qwen2_5_7b' | 'qwen2_5_3b' | 'deepseek_r1_7b' | 'local_llama_env';

export interface NpcDialogueRequest {
    generalId: string;
    contextKey?: string;
    selectedKeywordKeys: string[];
    toneMode?: string;
    locale?: NpcDialogueLocale;
    speechContextMode?: NpcDialogueSpeechContextMode;
    llmModelPreset?: NpcDialogueModelPreset;
    maxChars?: number;
    saveId?: string;
    memoryContext?: NpcGeneralMemoryContext | null;
}

export interface NpcDialogueResponse {
    generalId: string;
    contextKey?: string | null;
    locale?: NpcDialogueLocale;
    speechContextMode?: NpcDialogueSpeechContextMode;
    llmModelPreset?: NpcDialogueModelPreset;
    text: string;
    evidenceRefs: string[];
    usedEvidenceRefs?: string[];
    usedKeywords: Array<{
        keywordKey: string;
        category: string;
        label: string;
        sourceRefs: string[];
    }>;
    rejectedKeywordKeys: string[];
    fallbackUsed: boolean;
    generationMode: string;
    provider?: string | null;
    model?: string | null;
    providerTrace?: string[];
    qualityWarnings?: string[];
    repairUsed?: boolean;
}

export interface NpcDialogueKeywordSelection extends NpcKeywordOption {
    category: string;
}

export class NpcDialogueService {
    private _baseUrl = 'http://127.0.0.1:8765';

    public setBaseUrl(baseUrl: string): void {
        const normalized = baseUrl.trim().replace(/\/$/, '');
        if (!normalized) {
            throw new Error('[NpcDialogueService] baseUrl 不可為空');
        }
        this._baseUrl = normalized;
    }

    public async getKeywordOptions(
        generalId: string,
        categories: string[] = ['person', 'item', 'event'],
        limitPerCategory = 8,
    ): Promise<NpcKeywordOptionsResponse> {
        const query = this._buildQuery({
            generalId,
            categories: categories.join(','),
            limitPerCategory: String(limitPerCategory),
        });
        return this._requestJson<NpcKeywordOptionsResponse>('GET', `/v1/npc/keyword-options?${query}`);
    }


    public async getContextOptions(generalId: string, limit?: number): Promise<NpcContextOptionsResponse> {
        const query = this._buildQuery({
            generalId,
            ...(limit === undefined ? {} : { limit: String(limit) }),
        });
        return this._requestJson<NpcContextOptionsResponse>('GET', `/v1/npc/context-options?${query}`);
    }
    public flattenKeywordOptions(response: NpcKeywordOptionsResponse): NpcDialogueKeywordSelection[] {
        const result: NpcDialogueKeywordSelection[] = [];
        for (const [category, options] of Object.entries(response.categories ?? {})) {
            for (const option of options) {
                result.push({ ...option, category });
            }
        }
        return result;
    }

    public flattenContextOptions(response: NpcContextOptionsResponse): NpcContextOption[] {
        return [...(response.options ?? [])];
    }

    public async requestDialogue(request: NpcDialogueRequest): Promise<NpcDialogueResponse> {
        const payload = {
            generalId: request.generalId,
            contextKey: request.contextKey,
            selectedKeywordKeys: request.selectedKeywordKeys,
            toneMode: request.toneMode ?? 'in-character',
            locale: request.locale ?? 'zh-TW',
            speechContextMode: request.speechContextMode ?? 'life_chat',
            llmModelPreset: request.llmModelPreset ?? 'fallback_chain',
            maxChars: request.maxChars ?? 90,
            saveId: request.saveId,
            memoryContext: request.memoryContext ?? undefined,
        };
        UCUFLogger.info(LogCategory.DATA, '[NpcDialogueService] requestDialogue', payload);
        const response = await this._requestJson<NpcDialogueResponse>('POST', '/v1/npc/dialogue', payload);
        UCUFLogger.info(LogCategory.DATA, '[NpcDialogueService] requestDialogue response', {
            generalId: response.generalId,
            locale: response.locale ?? null,
            speechContextMode: response.speechContextMode ?? null,
            llmModelPreset: response.llmModelPreset ?? null,
            provider: response.provider ?? null,
            model: response.model ?? null,
            providerTrace: response.providerTrace ?? [],
            qualityWarnings: response.qualityWarnings ?? [],
            repairUsed: response.repairUsed ?? false,
            usedEvidenceRefs: response.usedEvidenceRefs ?? [],
            textPreview: response.text.slice(0, 64),
        });
        return response;
    }

    public async recordInteractionEvent(request: NpcInteractionEventPayload): Promise<NpcInteractionEventResponse> {
        const payload = {
            saveId: request.saveId,
            generalId: request.generalId,
            eventType: request.eventType,
            summary: request.summary,
            keywords: request.keywords ?? [],
            playerAction: request.playerAction ?? null,
            generalReaction: request.generalReaction ?? null,
            isMilestone: request.isMilestone ?? false,
        };
        UCUFLogger.info(LogCategory.DATA, '[NpcDialogueService] recordInteractionEvent', payload);
        return this._requestJson<NpcInteractionEventResponse>('POST', '/v1/npc/interaction-events', payload);
    }

    public async getGeneralMemory(saveId: string, generalId: string): Promise<NpcGeneralMemory> {
        const query = this._buildQuery({ saveId, generalId });
        return this._requestJson<NpcGeneralMemory>('GET', `/v1/npc/general-memory?${query}`);
    }

    public async saveGeneralMemory(memory: NpcGeneralMemory): Promise<NpcMemoryWriteResponse> {
        UCUFLogger.info(LogCategory.DATA, '[NpcDialogueService] saveGeneralMemory', {
            saveId: memory.saveId,
            generalId: memory.generalId,
            schemaVersion: memory.schemaVersion,
            lastCompressedIdx: memory.lastCompressedIdx,
            uncompressedCount: memory.uncompressedCount,
        });
        return this._requestJson<NpcMemoryWriteResponse>('POST', '/v1/npc/general-memory', memory);
    }

    public async compressGeneralMemory(request: NpcMemoryCompressRequest): Promise<NpcGeneralMemory> {
        UCUFLogger.info(LogCategory.DATA, '[NpcDialogueService] compressGeneralMemory', request);
        return this._requestJson<NpcGeneralMemory>('POST', '/v1/npc/memory/compress', request);
    }

    private _buildQuery(params: Record<string, string>): string {
        return Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
    }

    private _requestJson<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
        const url = `${this._baseUrl}${path}`;
        return new Promise<T>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            xhr.timeout = 6000;
            xhr.setRequestHeader('Accept', 'application/json');
            if (body !== undefined) {
                xhr.setRequestHeader('Content-Type', 'application/json');
            }
            xhr.onload = () => {
                if (xhr.status < 200 || xhr.status >= 300) {
                    reject(new Error(`[NpcDialogueService] HTTP ${xhr.status}: ${xhr.responseText}`));
                    return;
                }
                try {
                    resolve(JSON.parse(xhr.responseText) as T);
                } catch (error) {
                    reject(error);
                }
            };
            xhr.onerror = () => reject(new Error(`[NpcDialogueService] request failed: ${url}`));
            xhr.ontimeout = () => reject(new Error(`[NpcDialogueService] request timeout: ${url}`));
            xhr.send(body === undefined ? undefined : JSON.stringify(body));
        }).catch((error) => {
            UCUFLogger.warn(LogCategory.DATA, '[NpcDialogueService] API 呼叫失敗', { method, path, error });
            throw error;
        });
    }
}