module.exports = function(grunt) {

   grunt.initConfig({
      jshint: {
         all: ['Gruntfile.js', 'src/*.js', 'test/*.js'] 
      },
      mochacov: {
         coveralls: {
            options: {
               coveralls: {
                  serviceName: 'travis-ci'
               }
            }
         },
         coverage: {
            options: {
               reporter: 'html-cov',
               output: 'coverage/report.html'
            }
         },
         test: {
            options: {
               reporter: 'spec'
            }
         },
         options: {
            ui: 'exports',
            'no-colors': true,
            'files': 'test/*.js'
         }
      }
   });

   grunt.loadNpmTasks('grunt-contrib-jshint');
   grunt.loadNpmTasks('grunt-mocha-cov');

   // Default task(s).
   grunt.registerTask('test', ['jshint', 'mochacov:test', 'mochacov:coverage']);
   grunt.registerTask('travis', ['jshint', 'mochacov:test', 'mochacov:coveralls']);

   grunt.registerTask('default', ['test']);
};

