import json
import os

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

class ListLibDirTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = reverse('list_lib_dir', args=[self.repo.id])
        self.folder_name = os.path.basename(self.folder)

    def tearDown(self):
        self.remove_repo()

    def test_can_list(self):
        resp = self.client.get(self.endpoint, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 8
        assert self.folder_name == json_resp['dirent_list'][0]['obj_name']
        assert self.repo.name == json_resp['repo_name']
