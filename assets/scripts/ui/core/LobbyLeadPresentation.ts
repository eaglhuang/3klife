/** 新手試玩 #9：資料決定大廳主將；載入期間不留下範例圖，過期請求不得覆蓋。 */
export interface LobbyLeadPresentationPorts<T> {
    setTexts: (texts: Record<string, string>) => void;
    setVisible: (visible: boolean) => void;
    setFrame: (frame: T | null) => void;
    load: (id: string) => Promise<T | null>;
    isCurrent: () => boolean;
}

export async function presentLobbyLead<T>(
    general: { id: string; name: string; title?: string } | null,
    ports: LobbyLeadPresentationPorts<T>,
): Promise<void> {
    ports.setTexts({ LobbyMainScreen_div_22: general?.name ?? '', LobbyMainScreen_div_23: general?.title ?? '' });
    ports.setFrame(null);
    ports.setVisible(false);
    if (!general) return;
    const frame = await ports.load(general.id);
    if (!frame || !ports.isCurrent()) return;
    ports.setFrame(frame);
    ports.setVisible(true);
}
