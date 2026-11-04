enroll: (results) => {
            // 支援卡池只發教官卡，不把武將收進名冊（PROG-2-1085）
            this._gachaEnrollResult = results[0]?.poolId === MENTOR_POOL_ID
                ? { added: [], duplicates: [], rebirths: [] } as unknown as AddGeneralsResult
                : services().session.enrollGenerals(results.map((entry) => entry.general), { rebirthOnDuplicate: true, fromGacha: true });
            // 支援卡教官卡同批登記；實際寫入在入冊存檔後由 _applyGachaMentorJournal 補上（PROG-2-1004）
            services().session.queueGachaMentorDraw({
                drawn: results.map((entry) => entry.general),
                time: { ...services().session.gameTime },
                poolId: results[0]?.poolId,
            });
        }
