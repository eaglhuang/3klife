import assert from 'node:assert/strict';
import {
    archiveYearEndHonorRecord,
    createInitialYearPreview,
    getHonorWallDisplayList,
    migrateHonorWallSaveSlice,
    updateSeasonHonorSnapshot,
} from '../assets/scripts/core/systems/HonorWallModel';

// 1. 舊存檔遷移相容
const migrated = migrateHonorWallSaveSlice(undefined);
assert.deepEqual(migrated.honorWallRecords, []);
assert.equal(migrated.currentYearSnapshot, null);

// 2. 開局首年即可見進行中預覽卡片
const initialList = getHonorWallDisplayList(migrated, 1);
assert.equal(initialList.length, 1);
assert.equal(initialList[0].year, 1);
assert.equal(initialList[0].isPreview, true);

// 3. 每季快照更新
const q2 = updateSeasonHonorSnapshot(migrated, {
    year: 1,
    playerRank: 3,
    playerScore: 980,
    topThree: [],
    badgeUnlocked: null,
    speechSummaryKey: '',
});
assert.equal(q2.currentYearSnapshot?.playerRank, 3);
assert.equal(q2.currentYearSnapshot?.playerScore, 980);

// 4. 年末正式歸檔並清空當季快照
const archived = archiveYearEndHonorRecord(q2, {
    year: 1,
    playerRank: 2,
    playerScore: 1240,
    topThree: [
        { rank: 1, familyName: '荀氏', leaderGeneralId: 'xun-yu', score: 1380, isPlayer: false },
        { rank: 2, familyName: '主公府', leaderGeneralId: 'zhao-yun', score: 1240, isPlayer: true },
        { rank: 3, familyName: '張氏', leaderGeneralId: 'zhang-zhao', score: 1120, isPlayer: false },
    ],
    badgeUnlocked: null,
    speechSummaryKey: 'ui.ceremony.speech.1',
});
assert.equal(archived.currentYearSnapshot, null);
assert.equal(archived.honorWallRecords.length, 1);
assert.equal(archived.honorWallRecords[0].playerRank, 2);

// 5. 超過 maxStoredYears 裁除次要欄位
let many = archived;
for (let y = 2; y <= 52; y++) {
    many = archiveYearEndHonorRecord(many, {
        year: y,
        playerRank: 1,
        playerScore: 1500 + y,
        topThree: [],
        badgeUnlocked: 'three_peat_famous_house',
        speechSummaryKey: `ui.ceremony.speech.${y}`,
    }, 50);
}
assert.equal(many.honorWallRecords.length, 52);
assert.equal(many.honorWallRecords[51].speechSummaryKey, '');
assert.equal(many.honorWallRecords[51].badgeUnlocked, null);
assert.equal(createInitialYearPreview(1).isPreview, true);

console.log('HonorWallModel.test.ts passed');
