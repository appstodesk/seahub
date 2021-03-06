import json
import unittest
import pytest
import requests

from django.test import TestCase

from seahub import settings
from tests.api.apitestbase import ApiTestBase
from tests.api.urls import LIST_GROUP_AND_CONTACTS_URL, SERVER_INFO_URL

class MiscApiTest(ApiTestBase, TestCase):
    def test_list_group_and_contacts(self):
        res = self.get(LIST_GROUP_AND_CONTACTS_URL).json()
        self.assertIsNotNone(res)
        self.assertIsInstance(res['contacts'], list)
        self.assertIsNotNone(res['umsgnum'])
        self.assertIsNotNone(res['replynum'])
        self.assertIsInstance(res['groups'], list)
        self.assertIsNotNone(res['gmsgnum'])
        self.assertIsNotNone(res['newreplies'])

    def test_server_info(self):
        r = requests.get(SERVER_INFO_URL)
        r.raise_for_status()
        info = r.json()
        self.assertTrue('version' in info)
        self.assertTrue('seafile-basic' in info['features'])
        self.assertFalse('disable-sync-with-any-folder' in info['features'])

    @pytest.mark.xfail
    def test_server_info_with_disable_sync(self):
        settings.DISABLE_SYNC_WITH_ANY_FOLDER = True

        resp = self.client.get('/api2/server-info/')
        info = json.loads(resp.content)
        self.assertTrue('disable-sync-with-any-folder' in info['features'])
