module.exports = {
  '/': 'Index.index',
  'GET /': 'Index.index',
  'GET /(\\w+)': 'Index.$1',
  'GET /user/(?<id>\\d+)': 'User.index',
  'GET /test/(?<named>\\w+)': 'Test.${named}',
  '/multi': {
    get: 'Index.multiGet',
    post: 'Index.multiPost'
  },

  'GET /denyRoute': 'Index.denyRoute'
};