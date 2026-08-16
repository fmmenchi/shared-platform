export interface SbomGeneratorSchema {
  /** The project that should publish a bill of materials. */
  project: string;
  /** Skip formatting the files touched by this generator. */
  skipFormat?: boolean;
}
