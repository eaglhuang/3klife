// @spec-source → 因子解鎖系統規格書 §F「三階段解鎖表」、§I「Server 端」Player_ID／Player_Level／Unlock_Phase（FUL-06，PROG-2-0856）
/**
 * ful06-unlock-phase — Server 端入口；實作在 core/systems/UnlockPhase.ts（core 不可引用 server，故實作放 core）。
 */
export * from '../../assets/scripts/core/systems/UnlockPhase';
