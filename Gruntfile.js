// From the command line do `grunt` to concatenate and minify JS files.
// Run `grunt watch` to have it monitor the source JS files and automatically
// concatenate and minify them whenever one changes.
module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: ['public/js/modernizr.min.js',
              'bower_components/jquery/dist/jquery.min.js',
              'bower_components/socket.io-client/dist/socket.io.min.js',
              'public/js/src/plugins.js',
              'public/js/src/twelescreen_controller.js',
              'public/js/src/twelescreen_models.js'],
        dest: 'public/js/dist/<%= pkg.name %>.js'
      }
    },
    uglify: {
      options: {
        // To prevent changes to variable and function names:
        // mangle: false,
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'public/js/dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
    watch: {
      files: ['<%= concat.dist.src %>'],
      tasks: ['concat', 'uglify']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['concat', 'uglify']);

};
