import type { FC } from 'react';
import type { LearnVideo } from '../catalog';
import type { Theme } from '../tokens';
import { Board } from './Board';
import { Grill } from './Grill';
import { Loop } from './Loop';
import { Memory } from './Memory';
import { Skills } from './Skills';
import { Slices } from './Slices';

export const SCENES: Record<LearnVideo, FC<{ theme: Theme }>> = {
  memory: Memory,
  skills: Skills,
  grill: Grill,
  slices: Slices,
  loop: Loop,
  board: Board,
};
