module.exports = function(grunt) {

  grunt.initConfig({
    doxx: {
      all: {
        src: 'lib',
        target: 'docs'
      }
    },

    jsdoc : {
      dist : {
        src: ['lib/*.js', 'test/*.js'],
        options: {
          destination: 'doc'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-doxx');
  grunt.loadNpmTasks('grunt-jsdoc');

};