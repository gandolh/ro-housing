import { agentieImoTmAdapter } from './agentie-imo-tm.ts';
import { apostuAdapter } from './apostu.ts';
import { blitzAdapter } from './blitz.ts';
import { districtAdapter } from './district.ts';
import { foxfortAdapter } from './foxfort.ts';
import { hitchmosherAdapter } from './hitchmosher.ts';
import { imobiliareAdapter } from './imobiliare.ts';
import { primumAdapter } from './primum.ts';
import { storiaAdapter } from './storia.ts';
import type { Adapter } from './types.ts';

export const ADAPTER_REGISTRY: Record<string, Adapter> = {
  [imobiliareAdapter.id]: imobiliareAdapter,
  [storiaAdapter.id]: storiaAdapter,
  [foxfortAdapter.id]: foxfortAdapter,
  [blitzAdapter.id]: blitzAdapter,
  [hitchmosherAdapter.id]: hitchmosherAdapter,
  [agentieImoTmAdapter.id]: agentieImoTmAdapter,
  [apostuAdapter.id]: apostuAdapter,
  [primumAdapter.id]: primumAdapter,
  [districtAdapter.id]: districtAdapter,
};
