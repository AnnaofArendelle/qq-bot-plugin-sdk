export interface Message {
  readonly text: string; readonly sender: string; readonly senderName?: string;
  readonly sessionId: string; readonly groupId?: string; readonly channelType: 'group' | 'c2c';
  readonly platform: string; readonly isAt: boolean; readonly autoAtOnReply?: boolean;
  readonly meta?: { cf?: { colo?: string; country?: string; httpProtocol?: string; tlsVersion?: string }; receivedAt?: number | string };
}
export interface CommandInfo { pluginId: string; id: string; triggers: readonly string[]; description: string; }
export interface PluginContext<C = Record<string, unknown>> {
  readonly message: Message; readonly config: Readonly<C>;
  /** Available on core >=0.7.7. Time comes from the confirmed Cloudflare deployment, not an isolate start. */
  readonly runtime?: { readonly version: string; getDeployedAt(): Promise<string | null> };
  readonly command: { id: string; trigger: string; args: string };
  readonly commands: readonly CommandInfo[];
  readonly storage: { get<T = unknown>(key: string): Promise<T | null>; set(key: string, value: unknown): Promise<void>; delete(key: string): Promise<void>; putIfDay<T extends {day: string}>(key: string, value: T): Promise<T> };
  readonly reply: { text(text: string): Promise<void>; image(url: string): Promise<void> };
  readonly http: { json<T = unknown>(url: string, options?: { timeoutMs?: number }): Promise<T> };
  readonly log: { info(message: string): void; error(message: string): void };
}
export interface Plugin<C = Record<string, unknown>> {
  onCommand?(context: PluginContext<C>): Promise<void>;
  /** Adds a bounded instruction to the existing model turn; no extra AI request. */
  beforeModel?(context: PluginContext<C>): Promise<{ systemAppend?: string } | void>;
}
export declare function definePlugin<C = Record<string, unknown>>(plugin: Plugin<C>): Plugin<C>;
