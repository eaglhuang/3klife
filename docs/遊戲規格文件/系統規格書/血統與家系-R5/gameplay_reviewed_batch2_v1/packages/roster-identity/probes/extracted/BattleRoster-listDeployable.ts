export function listDeployable(roster: readonly GeneralConfig[], options: DeployOptions = {}): GeneralConfig[] {
    return roster.filter((general) => checkDeployable(general, options).eligible);
}
