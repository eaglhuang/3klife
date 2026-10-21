// cc/env 是 Cocos 編譯期的環境常數模組（DEV、EDITOR 等）。
// 雲端 cc-check 沒有編輯器產生的型別來源，這裡補一份最小宣告，只給 tsconfig.cc-check.json 使用。
// 正式建置由 Cocos 提供實際值，本檔不參與 Cocos 編譯。
declare module 'cc/env' {
    export const DEV: boolean;
    export const EDITOR: boolean;
    export const PREVIEW: boolean;
    export const BUILD: boolean;
    export const TEST: boolean;
}
