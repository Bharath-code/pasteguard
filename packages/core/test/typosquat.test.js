import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nearest } from '../src/typosquat.js'
test('near a popular name', () => { assert.equal(nearest('raect', 'npm'), 'react'); assert.equal(nearest('reqeusts', 'pypi'), 'requests') })
test('exact popular names and far names are fine', () => { assert.equal(nearest('react', 'npm'), null); assert.equal(nearest('zzqxv-unrelated', 'npm'), null) })
test('short names need distance 1', () => { assert.equal(nearest('zdo', 'npm'), null) })
test('pypi names are normalised', () => { assert.equal(nearest('Requests', 'pypi'), null); assert.equal(nearest('ruamel_yaml', 'pypi') === 'ruamel.yaml', false) })
