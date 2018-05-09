import { tsquery } from '@phenomnomnominal/tsquery';
import * as assert from 'assert';
import { getNodeAtFileOffset } from '../utils';

describe('utils', () => {
  describe('getNodeAtFileOffset()', () => {
    it('should return the node at the given position', () => {
      const source = tsquery.ast('let a = 5;');
      assert.equal(getNodeAtFileOffset(source, 4)!.getText(), 'a');
    });

    it('should return null if the given position is not valid', () => {
      const source = tsquery.ast('let a = 5;');
      assert.equal(getNodeAtFileOffset(source, 12), null);
    });
  });
});
