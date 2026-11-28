import assert from 'node:assert/strict';
import {
    buildMarriageRelationTags,
    formatMarriageRelationTagsLine,
} from '../assets/scripts/core/systems/MarriageRelationTags';

const mockT = (key: string, ...args: string[]): string => {
    if (key === 'ui.marriage.tag.oath_matchmaker') return `義兄作媒 +${args[0]}%`;
    if (key === 'ui.marriage.tag.rival_mutation') return `宿敵交融・狼性突變+${args[0]}%`;
    if (key === 'ui.marriage.tag.comrade_bonus') return `同袍默契 +${args[0]}%`;
    return key;
};

// 1. 無關係時回傳空陣列與空字串
const empty = buildMarriageRelationTags({
    isOathBrotherOrSister: false,
    isRival: false,
    isComrade: false,
});
assert.equal(empty.visibleTags.length, 0);
assert.equal(empty.overflowCount, 0);
assert.equal(formatMarriageRelationTagsLine(empty, mockT), '');

// 2. 最多顯示 2 枚標籤，第 3 枚收斂為 +1
const three = buildMarriageRelationTags({
    isOathBrotherOrSister: true,
    isRival: true,
    isComrade: true,
});
assert.equal(three.visibleTags.length, 2);
assert.equal(three.overflowCount, 1);
const formatted = formatMarriageRelationTagsLine(three, mockT);
assert.equal(formatted, '[義兄作媒 +10%] [宿敵交融・狼性突變+15%] [+1]');

console.log('MarriageRelationTags.test.ts passed');
