export async function startNewGameFromDestiny(
    session: DestinyNewGameTarget,
    seed: number,
    generals: readonly GeneralConfig[],
    state: Readonly<DestinyGachaState>,
    beautyGeneralId?: string | null,
): Promise<StarterGeneralId> {
    const locked = state.locked;
    if (state.phase !== 'locked' || locked === null) throw new Error('[DestinyPool] 宿命轉蛋尚未鎖定');
    const coreId = DESTINY_POOL_IDS.find((id) => id === locked);
    if (!coreId) throw new Error(`[DestinyPool] ${locked} 不在宿命池內`);
    await session.startNewGameWithStarters(seed, generals, beautyGeneralId ? { coreGeneralId: coreId, beautyGeneralId } : { coreGeneralId: coreId });
    return coreId;
}
