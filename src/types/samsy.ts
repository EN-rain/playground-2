export type SamsyMode = "explore" | "works" | "about";

export interface SamsyProject {
  url?: string;
  classname?: string;
  title: string;
  subtitle: string;
  tags: string;
  description: string;
  video: string;
  short: string;
  prices?: string;
  custom?: {
    text: string;
    link: string;
  };
  infos: {
    text: string;
  };
}

export interface PositionMark {
  x: number;
  y: number;
  z: number;
}

export interface EngineStats {
  fps: number;
  frameMs: number;
  engine: string;
  x: number;
  y: number;
  z: number;
  marks: PositionMark[];
}
