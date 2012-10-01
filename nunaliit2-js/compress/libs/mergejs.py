#!/usr/bin/env python
#
# Merge multiple JavaScript source code files into one.
#
# Usage:
# This script requires source files to have dependencies specified in them.
#
# Dependencies are specified with a comment of the form:
#
#     // @requires <file path>
#
#  e.g.
#
#    // @requires Geo/DataSource.js
#
# This script should be executed like so:
#
#     mergejs.py <output.js> <directory> [...]
#
# e.g.
#
#     mergejs.py openlayers.js Geo/ CrossBrowser/
#
#  This example will cause the script to walk the `Geo` and
#  `CrossBrowser` directories--and subdirectories thereof--and import
#  all `*.js` files encountered. The dependency declarations will be extracted
#  and then the source code from imported files will be output to 
#  a file named `openlayers.js` in an order which fulfils the dependencies
#  specified.
#
#
# Note: This is a very rough initial version of this code.
#
# -- Copyright 2005-2010 OpenLayers contributors / OpenLayers project --
#

# TODO: Allow files to be excluded. e.g. `Crossbrowser/DebugMode.js`?
# TODO: Report error when dependency can not be found rather than KeyError.

import re
import os
import sys

SUFFIX_JAVASCRIPT = ".js"

RE_REQUIRE = "@requires:? (.*)\n" # TODO: Ensure in comment?
class SourceFile:
    """
    Represents a Javascript source code file.
    """

    def __init__(self, filepath, source):
        """
        """
        self.filepath = filepath
        self.source = source

        self.requiredBy = []


    def _getRequirements(self):
        """
        Extracts the dependencies specified in the source code and returns
        a list of them.
        """
        # TODO: Cache?
        return re.findall(RE_REQUIRE, self.source)

    requires = property(fget=_getRequirements, doc="")



def usage(filename):
    """
    Displays a usage message.
    """
    print "%s [-c <config file>] <output.js> <directory> [...]" % filename


class Config:
    """
    Represents a parsed configuration file.

    A configuration file should be of the following form:

        [input]
        3rd/prototype.js
        core/application.js
        # A comment

    All headings are required.

    Any text appearing after a # symbol indicates a comment.
    
    """

    def __init__(self, filename):
        """
        Parses the content of the named file and stores the values.
        """
        lines = [re.sub("#.*?$", "", line).strip() # Assumes end-of-line character is present
                 for line in open(filename)
                 if line.strip() and not line.strip().startswith("#")] # Skip blank lines and comments

        self.input = lines[lines.index("[input]") + 1:]

def run (sourceDirectory, configFile = None, outputFilename = None):
    cfg = None
    if configFile:
        cfg = Config(configFile)
        print "Config file: %s" % configFile

    allFiles = []

    ## Header inserted at the start of each file in the output
    HEADER = "/* " + "=" * 70 + "\n    %s\n" + "   " + "=" * 70 + " */\n\n"

    files = {}

    for filepath in cfg.input:
        print "Importing: %s" % filepath
        fullpath = os.path.join(sourceDirectory, filepath).strip()
        content = open(fullpath, "U").read()
        files[filepath] = SourceFile(filepath, content)
    
    print
    ## Output the files in the determined order
    result = []

    for fp in cfg.input:
        f = files[fp]
        print "Exporting: ", f.filepath
        result.append(HEADER % f.filepath)
        source = f.source
        result.append(source)
        if not source.endswith("\n"):
            result.append("\n")

    print "\nTotal files merged: %d " % len(files)

    if outputFilename:
        print "\nGenerating: %s" % (outputFilename)
        open(outputFilename, "w").write("".join(result))
        
    return "".join(result)

if __name__ == "__main__":
    import getopt

    options, args = getopt.getopt(sys.argv[1:], "-c:")
    
    try:
        outputFilename = args[0]
    except IndexError:
        usage(sys.argv[0])
        raise SystemExit
    else:
        sourceDirectory = args[1]
        if not sourceDirectory:
            usage(sys.argv[0])
            raise SystemExit

    configFile = None
    if options and options[0][0] == "-c":
        configFile = options[0][1]
        print "Parsing configuration file: %s" % configFile

    print "sourceDirectory: %s" % sourceDirectory
    print "outputFilename: %s" % outputFilename
    print "configFile: %s" % configFile

    run( sourceDirectory, configFile, outputFilename )