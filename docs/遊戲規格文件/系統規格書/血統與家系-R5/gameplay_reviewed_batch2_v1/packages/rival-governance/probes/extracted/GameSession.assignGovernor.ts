public assignGovernor(task: string, generalUid: string, maxSlots: number = this.maxTaskSlots): GovernanceResult {
        if (!this._roster.getAll().some((general) => general.id === generalUid)) return { ok: false, reason: 'invalid-general', assignments: this.governanceAssignments };
        const result = assignGovernanceGeneral(this._governance, task, generalUid, maxSlots);
        if (result.ok) this._governance = result.assignments;
        return result;
    }