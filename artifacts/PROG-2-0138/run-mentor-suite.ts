import { createMentorCardTabsSuite } from '../../tests/MentorCardTabs.test';

createMentorCardTabsSuite().run().then(results => {
    console.log(JSON.stringify(results, null, 2));
    if (results.some(result => !result.passed)) process.exitCode = 1;
});
