import json
import httplib
import logging
import subprocess

from seahub.base.accounts import AuthBackend as SeahubAuthBackend
import seahub.base.accounts as accounts

logger = logging.getLogger(__name__)


class EyeosCardAuthBackend(object):
    def get_user(self, username):
        try:
            seahubAuth = SeahubAuthBackend()
            user = seahubAuth.get_user(username)
        except accounts.User.DoesNotExist:
            logger.debug('user does not exist')
            return False
        except Exception as e:
            logger.debug('got exception while authenticating with EyeosCardAuthBackend')
            logger.debug(e)
            return False
        return user

    def authenticate(self, username=None, password=None):
        # username is the regular eyeos user, password is JSONIified
        # {"card":"a-user-card", "signature":"a-user-signature"}, so we need to split the
        # card/signature and validate it
        try:
            auth = json.loads(password)
            card_username = self._extract_username_from_card(auth['card'])
            card_domain = self._extract_domain_from_card(auth['card'])
            logger.debug('extracted username %s from card' % card_username)
            if card_username != username:
                logger.debug('Used username "%s" differs from username in the card "%s"' % (username, card_username))
                return None
        except (ValueError, KeyError) as e:
            logger.debug('got exception trying to authenticate with EyeosCardAuthBackend. Skip it.')
            # not json, do not use this AuthBackend
            return None

        if self._validate_card(card=auth['card'], signature=auth['signature']):
            user = self.get_user(username + '@' + card_domain)
            if user:
                return user
            else:
                return None
        else:
            return None

    def _extract_username_from_card(self, card):
        card_object = json.loads(card)
        return card_object['username']

    def _extract_domain_from_card(self, card):
        card_object = json.loads(card)
        return card_object['domain']

    def _validate_card(self, card, signature):
        args = {'c': json.loads(card), 's': signature}
        process = subprocess.Popen(['node', '/opt/auth/index.js', json.dumps(args)], stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE)
        # Uncomment these lines to activate logging
        # stdout, stderr = process.communicate()
        # with open("/tmp/card_validation.log", "a") as logfile:
        #     logfile.write("#STDOUT: " + str(stdout) + "\n#STDERR: " + str(stderr) + '\n\n')
        ret_code = process.wait()
        if ret_code == 0:
            return True
        else:
            return False
