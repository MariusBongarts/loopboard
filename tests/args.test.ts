import { describe, expect, it } from 'vitest';
import { parseArgs, UsageError, type Flags } from '../server/args';

const FLAGS: Flags = { '--path': 'value', '--file': 'value', '--dry-run': 'switch' };
const parse = (...argv: string[]) => parseArgs(argv, FLAGS, 'loopboard renumber');

describe('parseArgs (#0076)', () => {
  it('keeps a flag\'s value out of the positionals', () => {
    expect(parse('0042', '--path', '../repo')).toEqual({
      positionals: ['0042'],
      switches: new Set(),
      values: { '--path': '../repo' },
    });
    expect(parse('--file', '0042-twin.md', '0042', '0050', '--dry-run')).toEqual({
      positionals: ['0042', '0050'],
      switches: new Set(['--dry-run']),
      values: { '--file': '0042-twin.md' },
    });
  });

  it('reads --flag=value, where the value may start with a dash', () => {
    expect(parse('--path=../repo', '--file=-odd.md').values).toEqual({ '--path': '../repo', '--file': '-odd.md' });
  });

  it('refuses a flag the command does not declare, naming it and the ones it takes', () => {
    expect(() => parse('0042', '--kind', 'docs')).toThrow(UsageError);
    expect(() => parse('0042', '--kind', 'docs')).toThrow(
      'Unknown flag --kind: `loopboard renumber` takes --path, --file, --dry-run.',
    );
    expect(() => parse('-n')).toThrow(/^Unknown flag -n:/);
    expect(() => parse('--dry-run=yes')).toThrow(/^Unknown flag --dry-run=yes:/);
    expect(() => parseArgs(['--strict'], {}, 'loopboard next-id')).toThrow(
      'Unknown flag --strict: `loopboard next-id` takes no flags.',
    );
  });

  it('refuses a value flag without a value', () => {
    expect(() => parse('0042', '--path')).toThrow('Flag --path needs a value.');
    expect(() => parse('--path', '--dry-run')).toThrow('Flag --path needs a value.');
    expect(() => parse('--path=')).toThrow('Flag --path needs a value.');
  });
});
