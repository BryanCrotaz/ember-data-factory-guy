import Ember from 'ember';
import { moduleFor, test } from 'ember-qunit';
import FactoryGuy, { mockFindAll, mockQuery } from 'ember-data-factory-guy';
import { inlineSetup } from '../../helpers/utility-methods';
import sinon from 'sinon';
import RequestManager from 'ember-data-factory-guy/mocks/request-manager';

const serializerType = '-json-api';

moduleFor('serializer:application', 'MockFindAll', inlineSetup(serializerType));

test("mock has mockId after setup", async function(assert) {
  let mock = mockFindAll('user');
  await Ember.run(async () => FactoryGuy.store.findAll('user'));
  assert.deepEqual(mock.mockId, {type: 'GET', url: '/users', num: 0});
});

test("logging response", async function(assert) {
  FactoryGuy.settings({logLevel: 1});

  const consoleStub = sinon.spy(console, 'log'),
        mock        = mockFindAll('profile');

  await Ember.run(async () => FactoryGuy.store.findAll('profile'));

  let response     = JSON.parse(mock.actualResponseJson()),
      expectedArgs = [
        "[factory-guy]",
        "MockFindAll",
        "GET",
        "[200]",
        "/profiles",
        response
      ];

  assert.deepEqual(consoleStub.getCall(0).args, expectedArgs, 'without query params');

  const queryParams = {include: 'company'};
  mock.withParams(queryParams);
  await Ember.run(async () => FactoryGuy.store.findAll('profile', queryParams));
  expectedArgs[4] = `/profiles?${Ember.$.param(queryParams)}`;

  assert.deepEqual(consoleStub.getCall(1).args, expectedArgs, 'with query params');

  console.log.restore();
});

test("#get method to access payload", function(assert) {
  let mock = mockFindAll('user', 2);
  assert.deepEqual(mock.get(0), {id: 1, name: 'User1', style: 'normal'});
});

test("RequestManager creates wrapper with one mockFindAll mock", async function(assert) {
  let mock = mockFindAll('user', 2);

  await Ember.run(async () => FactoryGuy.store.findAll('user'));

  let wrapper = RequestManager.findWrapper({handler: mock}),
      ids     = wrapper.getHandlers().map(h => h.mockId);

  assert.deepEqual(ids, [{type: 'GET', url: '/users', num: 0}]);
});

test("RequestManager creates wrapper with two mockFindAll mocks", async function(assert) {
  mockFindAll('user', 2);
  mockFindAll('user', 1);

  await Ember.run(async () => FactoryGuy.store.findAll('user'));

  let wrapper = RequestManager.findWrapper({type: 'GET', url: '/users'}),
      ids     = wrapper.getHandlers().map(h => h.mockId);

  assert.deepEqual(ids, [
    {type: 'GET', url: '/users', num: 0},
    {type: 'GET', url: '/users', num: 1}
  ]);
});

test("mockFindAll (when declared FIRST ) won't be used if mockQuery is present with query ", async function(assert) {
  let mockF = mockFindAll('user', 2);
  let mockQ = mockQuery('user', {name: 'Sleepy'});

  await FactoryGuy.store.query('user', {});

  assert.equal(mockF.timesCalled, 1, 'mockFindAll used since no query params exist');
  assert.equal(mockQ.timesCalled, 0, 'mockQuery not used');

  await FactoryGuy.store.query('user', {name: 'Sleepy'});
  assert.equal(mockF.timesCalled, 1, 'mockFindAll not used since query params exist');
  assert.equal(mockQ.timesCalled, 1, 'now mockQuery is used');
});

moduleFor('serializer:application', 'MockFindAll #getUrl', inlineSetup(serializerType));

test("uses urlForFindAll if it is set on the adapter", function(assert) {
  let mock = mockFindAll('user');
  assert.equal(mock.getUrl(), '/users', 'default ember-data findRecord url');

  let adapter = FactoryGuy.store.adapterFor('user');
  let findAllStub = sinon.stub(adapter, 'urlForFindAll').returns('/zombies');

  assert.equal(mock.getUrl(), '/zombies', 'factory guy uses urlForFindRecord from adapter');
  assert.ok(findAllStub.calledOnce);
  assert.ok(findAllStub.calledWith('user'), 'correct parameters passed to urlForFindAll');

  adapter.urlForFindAll.restore();
});

test("#getUrl passes adapterOptions to urlForFindAll", function(assert) {
  let adapterOptions = {e: 1},
      adapter        = FactoryGuy.store.adapterFor('user'),
      findRecordStub = sinon.stub(adapter, 'urlForFindAll');

  mockFindAll('user').withAdapterOptions(adapterOptions).getUrl();

  let [modelName, snapshot] = findRecordStub.getCall(0).args;
  assert.equal(modelName, 'user', 'modelName param is correct');
  assert.deepEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions present in snapshot param');

  adapter.urlForFindAll.restore();
});
