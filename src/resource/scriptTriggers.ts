import { SymbolType } from './enum/symbolTypes.js';

interface TriggerSymbolType {
  name: string;
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

export function getAllTriggers(): string[] {
  return Object.keys(runescriptTrigger);
}

function buildMatchForTrigger(name: string, symbolType: SymbolType, declaration: boolean): TriggerSymbolType {
  return { name, symbolType, declaration };
}

const runescriptTrigger: Record<string, TriggerSymbolType> = {
  proc: buildMatchForTrigger('proc', SymbolType.Proc, true),
  label: buildMatchForTrigger('label', SymbolType.Label, true),
  queue: buildMatchForTrigger('queue', SymbolType.Queue, true),
  weakqueue: buildMatchForTrigger('weakqueue', SymbolType.Queue, true),
  longqueue: buildMatchForTrigger('longqueue', SymbolType.Queue, true),
  strongqueue: buildMatchForTrigger('strongqueue', SymbolType.Queue, true),
  softtimer: buildMatchForTrigger('softtimer', SymbolType.Softtimer, true),
  timer: buildMatchForTrigger('timer', SymbolType.Timer, true),
  ai_timer: buildMatchForTrigger('ai_timer', SymbolType.Npc, false),
  if_button: buildMatchForTrigger('if_button', SymbolType.Component, false),
  if_close: buildMatchForTrigger('if_close', SymbolType.Interface, false),
  walktrigger: buildMatchForTrigger('walktrigger', SymbolType.Walktrigger, true),
  ai_walktrigger: buildMatchForTrigger('ai_walktrigger', SymbolType.Npc, false),
  ai_spawn: buildMatchForTrigger('ai_spawn', SymbolType.Npc, false),
  ai_despawn: buildMatchForTrigger('ai_despawn', SymbolType.Npc, false),
  debugproc: buildMatchForTrigger('debugproc', SymbolType.Proc, true),
  login: buildMatchForTrigger('login', SymbolType.Unknown, true),
  logout: buildMatchForTrigger('logout', SymbolType.Unknown, true),
  tutorial: buildMatchForTrigger('tutorial', SymbolType.Unknown, true),
  advancestat: buildMatchForTrigger('advancestat', SymbolType.Stat, false),
  changestat: buildMatchForTrigger('changestat', SymbolType.Stat, false),
  mapzone: buildMatchForTrigger('mapzone', SymbolType.Unknown, true),
  mapzoneexit: buildMatchForTrigger('mapzoneexit', SymbolType.Unknown, true),
  zone: buildMatchForTrigger('zone', SymbolType.Unknown, true),
  zoneexit: buildMatchForTrigger('zoneexit', SymbolType.Unknown, true),
  command: buildMatchForTrigger('command', SymbolType.Command, true)
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
    const trigger = `${incTrigDef.triggerName}${i}`;
    runescriptTrigger[trigger] = buildMatchForTrigger(trigger, incTrigDef.defaultMatch, false);
  }
  if (incTrigDef.includeU) runescriptTrigger[`${incTrigDef.triggerName}u`] = buildMatchForTrigger(`${incTrigDef.triggerName}u`, incTrigDef.defaultMatch, false);
  if (incTrigDef.includeT) runescriptTrigger[`${incTrigDef.triggerName}t`] = buildMatchForTrigger(`${incTrigDef.triggerName}t`, SymbolType.Component, false);
  if (incTrigDef.includeD) runescriptTrigger[`${incTrigDef.triggerName}d`] = buildMatchForTrigger(`${incTrigDef.triggerName}d`, incTrigDef.defaultMatch, false);
});
