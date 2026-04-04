declare module '@deck.gl/core' {
  export class Deck {
    constructor(props: Record<string, unknown>);
    setProps(props: Record<string, unknown>): void;
    finalize(): void;
  }
}
declare module '@deck.gl/layers';
declare module '@deck.gl/geo-layers';
declare module '@deck.gl/mapbox';
