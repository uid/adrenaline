from db_connection import DBConnection

import subprocess, shlex
from optparse import OptionParser
import os
import re
from datetime import datetime
from timeutils import unixtime

def encodeVideo(head, name, extension):
    """Encodes the video into a FLV and returns the filename"""

    # ffmpeg -i filename.3gp -an -g 1 filename.flv
    cmd = "ffmpeg"
    cmd += " -i " + generateFilename(head, name, extension) # filename 
    cmd += " -an -g 1 -y " # an: no audio; -g 1: keyframe every frame; -y: force overwrite output files
    cmd += " " + generateFilename(head, name, ".flv") # output file

    args = shlex.split(cmd)
    process = subprocess.Popen(args, stdout = subprocess.PIPE, stderr=subprocess.PIPE)
    output = process.communicate()[1]
    print("Finished encoding")
    
    # get width and height from the output
    pattern = re.compile('Output.*Stream #0.*\ (?P<width>\d+)x(?P<height>\d+) \[')
    groups = re.search(pattern, output.replace('\n', ''))
    width = int(groups.group('width'))
    height = int(groups.group('height'))
    return (width, height)
    
def uploadVideo(name, width, height):
    db = DBConnection()
    try:
        sql = """INSERT INTO videos (filename, width, height, creationtime) VALUES (%s, %s, %s, %s)"""
        db.query_and_return_array(sql, (name, width, height, unixtime(datetime.now())))
    except Exception, e:
        print("Error writing video to database:")
        print(e)

def generateFilename(head, name, extension):
    return head+os.sep+name+extension
    
if __name__ == "__main__":
    parser = OptionParser() #no options now, the only thing is the 
    parser.add_option("-f", "--file", dest="filename",
                      help="3gp video input FILE", metavar="FILE")
    (options, args) = parser.parse_args()
    
    filename = options.filename
    (head, tail) = os.path.split(filename) # ('/foo/bar/baz/', 'quux.txt')
    (name, extension) = os.path.splitext(tail) # ('quux', 'txt')

    (width, height) = encodeVideo(head, name, extension)
    uploadVideo(name, width, height)