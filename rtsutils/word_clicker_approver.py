import work_approver

import MySQLdb

import logging
import sys
from optparse import OptionParser

import simplejson as json
from decimal import Decimal
import settings

import datetime

from timeutils import parseISO

import mt_connection
import condition

APPROVE_REASON = "Accurate work. Thank you!"
REJECT_REASON = "Too many missed/erroneously clicked verbs. Sorry."
BONUS_AMOUNT = 0.03
BONUS_REASON = "$0.03 bonus for quick response. Thank you!"

PRECISION_LIMIT = 0.66  # 2/3s of what was selected must be verbs
RECALL_LIMIT = 0.33  # must have gotten 1/3 of all verbs

BONUS_TIME_LIMIT = Decimal(2) # seconds

"""
Mapping of answer dict keys (right) to meaning (left)

assignmentid = assignmentId
workerid = w
experiment = e
textid = t
wordarray = wa
accept = a
show = sh
go = g
first = f
submit = su
"""

def answer_reviewer(answer):
    result = None
    approve_response = (True, APPROVE_REASON)
    reject_response = (False, REJECT_REASON)

    try:
        words = json.loads(answer['wa'])
        textid = answer['t']
        a = calculateAccuracy(textid, words)
        print "calculated precision recall of: " + str(a)
        precision = a['precision']
        recall = a['recall']
        if precision >= PRECISION_LIMIT and recall >= RECALL_LIMIT:
            result = approve_response
        else:
            result = reject_response
    except:
        logging.exception("error reviewing answer: " + str(answer))

    return result

def bonus_evaluator(answer):
    """ Returns tuple (True/False [give bonus?], Amount [float], Reason [string])"""

    bonus_response = (True, BONUS_AMOUNT, BONUS_REASON)
    no_bonus_response = (False, None, None)
    result = no_bonus_response
    
    try:
        workerid = answer['w']
        if condition.isReward(workerid):
            show = parseISO(answer['sh'])
            go = parseISO(answer['g'])
            diff = go-show
            if diff < BONUS_TIME_LIMIT:
                result = bonus_response
    except:
        logging.exception('error calculating bonus for answer: ' + str(answer))
    return result

def calculateAccuracy(text_id, verbs):
    """ Looks up the ground truth in the database and calculates precision and recall. """
    db=MySQLdb.connect(host=settings.DB_HOST, passwd=settings.DB_PASSWORD, user=settings.DB_USER, db=settings.DB_DATABASE, use_unicode=True)
    cur = db.cursor()
    
    cur.execute("""SELECT wordid FROM groundtruth WHERE textid = %s""", (text_id))
    ground_truth = [row[0] for row in cur.fetchall()]
    
    try:
        precision = float(len(set(verbs).intersection(ground_truth))) / len(verbs)
    except ZeroDivisionError:
        precision = 1 # otherwise we show an error that they "highlighted many verbs", which is weird if you haven't highlighted anything
    
    try:
        recall = float(len(set(verbs).intersection(ground_truth))) / len(ground_truth)
    except ZeroDivisionError:
        recall = 0
        
    return { 'precision': precision, 'recall': recall }

def approve_word_clicker_hits_and_clean_up(verbose=True, dry_run=False):
    """ NOTE: This function currently does NOT pay bonuses!

        To re-enamble bonuses, pass in the bonus evaluator defined in
        this file to the "bonus_evaluator" variable of "review_pending_assignments"
    """
    conn = mt_connection.get_mt_conn()
    print "== REVIEWING WORD CLICKER HITS =="

    reviewed_counts = work_approver.review_pending_assignments(conn,
                                                     bonus_evaluator = bonus_evaluator,
                                                     answer_reviewer=answer_reviewer,
                                                     verbose=verbose,
                                                     dry_run=dry_run)
    
    print "\n\nDONE! Number of reviewed hits: " + str(reviewed_counts) + "\n\n"
    print "== CLEANING UP OLD HITS =="

    cleaned_counts = work_approver.clean_up_old_hits(conn, verbose=True, dry_run=dry_run)

    print "\n\nDONE! Number of cleaned hits: " + str(cleaned_counts) + "\n\n"
    return (reviewed_counts, cleaned_counts)
    
if __name__ == "__main__":
    approve_word_clicker_hits_and_clean_up(verbose=True, dry_run=False)
