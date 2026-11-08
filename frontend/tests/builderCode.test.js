// The Base Builder Code goes on contract calls only, never on a plain ETH send.
import test from 'node:test';
import assert from 'node:assert/strict';
import { appendBuilderSuffix, BUILDER_CODE_HEX } from '../src/config/builderCode.js';

test('a plain ETH send keeps empty calldata', () => {
  // an EIP-7702 wallet such as 0x9F687A81012e8039679b43BD7A910b5Cf4bb6fC4 reverts an ETH send that carries data
  for (const data of [undefined, null, '', '0x']) assert.equal(appendBuilderSuffix(data), '0x');
});

test('a contract call gets the Builder Code once', () => {
  const call = '0x183ff085';
  const withCode = appendBuilderSuffix(call);
  assert.equal(withCode, `${call}${BUILDER_CODE_HEX}`);
  assert.equal(appendBuilderSuffix(withCode), withCode);
  assert.equal(appendBuilderSuffix('183ff085'), withCode);
});
