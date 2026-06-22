declare module "circomlibjs" {
  export type Poseidon = {
    (inputs: Array<string | number | bigint>): unknown;
    F: {
      toString(value: unknown): string;
    };
  };

  export function buildPoseidon(): Promise<Poseidon>;
}

declare module "circomlibjs-poseidon-wasm" {
  import type { Poseidon } from "circomlibjs";

  export function buildPoseidon(): Promise<Poseidon>;
}
