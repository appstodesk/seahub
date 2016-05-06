# -*- coding: utf-8 -*-
import re

import seaserv

from seahub.utils import is_org_context

class BadGroupNameError(Exception):
    pass

class ConflictGroupNameError(Exception):
    pass

def validate_group_name(group_name):
    """
    Check whether group name is valid.
    A valid group name only contains alphanumeric character, and the length
    should less than 255.
    """
    if len(group_name) > 255:
        return False
    return re.match('^[\w\s-]+$', group_name, re.U)

def check_group_name_conflict(request, new_group_name, new_group_domain=None):
    """Check if new group name conflict with existed group.

    return "True" if conflicted else "False"
    """
    org_id = -1
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        checked_groups = seaserv.get_org_groups_by_user(org_id, username)
    else:
        if request.cloud_mode:
            checked_groups = seaserv.get_personal_groups_by_user(username)
        else:
            checked_groups = seaserv.ccnet_threaded_rpc.get_all_groups(-1, -1)

    for g in checked_groups:
        if g.group_name == new_group_name and get_group_domain(g.id) == new_group_domain:
            return True

    return False

def get_group_domain(group_id):
    members = seaserv.ccnet_threaded_rpc.get_group_members(group_id)
    if len(members):
        return members[0].user_name.split('@')[1]
    return None
