import type { TransformRequest, TransformUsage } from "@suitemind/contracts";

export interface ProviderContext {
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

export interface ProviderResult {
  usage?: TransformUsage;
}

export interface TransformProvider {
  readonly id: string;
  readonly model: string;
  transform(
    request: TransformRequest,
    context: ProviderContext,
  ): Promise<ProviderResult>;
}
