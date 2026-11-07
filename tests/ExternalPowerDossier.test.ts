/**
 * ExternalPowerDossier — 異域壓力源與沙盤遠征檔案（RAI-16；PROG-2-1968）
 */
import { assert, TestSuite } from './TestRunner';
import {
    dossierStateOf, expeditionDossiers,
} from '../assets/scripts/core/systems/ExternalPowerDossier';

export function createExternalPowerDossierSuite(): TestSuite {
    const suite = new TestSuite('ExternalPowerDossier (異域壓力源 RAI-16 PROG-2-1968)');

    suite.test('依沙盤階段切換狀態，且不倒退', () => {
        assert.equals(null, dossierStateOf(null, false));
        assert.equals(null, dossierStateOf('S1', true));
        assert.equals('LOCKED_TEASER', dossierStateOf('S2', true));
        assert.equals('REVEALED', dossierStateOf('S3', false));
        assert.equals('ACTIVE', dossierStateOf('S3', true));
        assert.equals('ACTIVE', dossierStateOf('S3', false, 'ACTIVE'));
        assert.equals('REVEALED', dossierStateOf('S2', false, 'REVEALED'));
    });

    suite.test('沙盤檔案列：三類壓力源，預告只露方位', () => {
        assert.equals(0, expeditionDossiers('S1').length);
        const teasers = expeditionDossiers('S2');
        assert.equals(3, teasers.length);
        assert.equals('NORTHWEST,SEA,WEST', teasers.map((d) => d.frontier).join(','));
        assert.isTrue(teasers.every((d) => d.state === 'LOCKED_TEASER' && d.threatText === '威脅：？'));
        assert.isFalse(teasers[0].title.includes('草原'));
        const s3 = expeditionDossiers('S3', ['WESTERN_EXPEDITION']);
        assert.equals('REVEALED,REVEALED,ACTIVE', s3.map((d) => d.state).join(','));
        assert.equals('草原霸權', s3[0].title);
        assert.isTrue(s3[2].threatText.startsWith('戰線開啟'));
        assert.equals('DOSSIER_STEPPE_HEGEMONY', s3[0].dossierId);
    });

    return suite;
}
