import { SymbolType } from './enum/symbolTypes.js';

interface TriggerSymbolType {
  symbolType: SymbolType;
  declaration: boolean;
}

interface incrementingTriggerDefinition {
  triggerName: string; 
  increments: number;
  includeU: boolean; 
  includeT: boolean;
  includeD: boolean;
  defaultMatch: SymbolType;
}

export function getScriptTriggerSymbol(trigger: string): TriggerSymbolType | undefined {
  return runescriptTrigger[trigger] ?? undefined;
}

function buildMatchForTrigger(symbolType: SymbolType, declaration: boolean): TriggerSymbolType {
  return { symbolType, declaration };
}

const runescriptTrigger: Record<string, TriggerSymbolType> = {
  proc: buildMatchForTrigger(SymbolType.Proc, true),
  label: buildMatchForTrigger(SymbolType.Label, true),
  queue: buildMatchForTrigger(SymbolType.Queue, true),
  weakqueue: buildMatchForTrigger(SymbolType.Queue, true),
  longqueue: buildMatchForTrigger(SymbolType.Queue, true),
  strongqueue: buildMatchForTrigger(SymbolType.Queue, true),
  softtimer: buildMatchForTrigger(SymbolType.Softtimer, true),
  timer: buildMatchForTrigger(SymbolType.Timer, true),
  ai_timer: buildMatchForTrigger(SymbolType.Npc, false),
  if_button: buildMatchForTrigger(SymbolType.Component, false),
  if_close: buildMatchForTrigger(SymbolType.Interface, false),
  walktrigger: buildMatchForTrigger(SymbolType.Walktrigger, true),
  ai_walktrigger: buildMatchForTrigger(SymbolType.Npc, false),
  ai_spawn: buildMatchForTrigger(SymbolType.Npc, false),
  ai_despawn: buildMatchForTrigger(SymbolType.Npc, false),
  debugproc: buildMatchForTrigger(SymbolType.Proc, true),
  login: buildMatchForTrigger(SymbolType.Unknown, true),
  logout: buildMatchForTrigger(SymbolType.Unknown, true),
  tutorial: buildMatchForTrigger(SymbolType.Unknown, true),
  advancestat: buildMatchForTrigger(SymbolType.Stat, false),
  changestat: buildMatchForTrigger(SymbolType.Stat, false),
  mapzone: buildMatchForTrigger(SymbolType.Unknown, true),
  mapzoneexit: buildMatchForTrigger(SymbolType.Unknown, true),
  zone: buildMatchForTrigger(SymbolType.Unknown, true),
  zoneexit: buildMatchForTrigger(SymbolType.Unknown, true),
  command: buildMatchForTrigger(SymbolType.Command, true)
};

// Builds a map value for each of the incrementing triggers (i.e. opncp1, opnpc2, ..., opnpc5)
// Also can specify which triggers have a U/T/D value (i.e. opnpcU)
const incrementingTriggers: incrementingTriggerDefinition[] = [
  { triggerName: 'opnpc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Npc },
  { triggerName: 'apnpc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Npc },
  { triggerName: 'ai_apnpc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Npc },
  { triggerName: 'ai_opnpc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Npc },
  { triggerName: 'opobj', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Obj },
  { triggerName: 'apobj', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Obj },
  { triggerName: 'ai_apobj', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Obj },
  { triggerName: 'ai_opobj', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Obj },
  { triggerName: 'oploc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Loc },
  { triggerName: 'aploc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Loc },
  { triggerName: 'ai_aploc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Loc },
  { triggerName: 'ai_oploc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Loc },
  { triggerName: 'opplayer', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Unknown },
  { triggerName: 'applayer', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Unknown },
  { triggerName: 'ai_applayer', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Npc },
  { triggerName: 'ai_opplayer', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Npc },
  { triggerName: 'ai_queue', increments: 20, includeU: false, includeT: false, includeD: false, defaultMatch: SymbolType.Npc },
  { triggerName: 'opheld', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: SymbolType.Obj },
  { triggerName: 'inv_button', increments: 5, includeU: false, includeT: false, includeD: true, defaultMatch: SymbolType.Component },
];

// Build the triggers with increments and U/T/D
incrementingTriggers.forEach(incTrigDef => {
  for (let i = 1; i <= incTrigDef.increments; i++) {
    runescriptTrigger[`${incTrigDef.triggerName}${i}`] = buildMatchForTrigger(incTrigDef.defaultMatch, false);
  }
  if (incTrigDef.includeU) runescriptTrigger[`${incTrigDef.triggerName}u`] = buildMatchForTrigger(incTrigDef.defaultMatch, false);
  if (incTrigDef.includeT) runescriptTrigger[`${incTrigDef.triggerName}t`] = buildMatchForTrigger(SymbolType.Component, false);
  if (incTrigDef.includeD) runescriptTrigger[`${incTrigDef.triggerName}d`] = buildMatchForTrigger(incTrigDef.defaultMatch, false);
});
