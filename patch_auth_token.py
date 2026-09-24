import re

with open('platform/core/routes/auth.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix super_admin token
super_admin_pattern = r'''            token_data = \{"sub": user\.username, "is_super_admin": True\}
            return TokenResponse\(
                access_token=create_access_token\(token_data\),
                role="super_admin",
            \)'''

super_admin_replacement = '''            token_data = {"sub": user.username, "is_super_admin": True, "role": "super_admin"}
            return TokenResponse(
                access_token=create_access_token(token_data),
                role="super_admin",
            )'''

content = re.sub(super_admin_pattern, super_admin_replacement, content)

# Fix business_admin token
biz_admin_pattern = r'''        token_data = \{
            "sub": user\.username,
            "is_super_admin": False,
            "business_id": user\.business_id,
            "active_branch_id": user\.branch_id,
            "vertical_type": business\.vertical_type if business else "laundry",
        \}
        return TokenResponse\('''

biz_admin_replacement = '''        token_data = {
            "sub": user.username,
            "is_super_admin": False,
            "business_id": user.business_id,
            "active_branch_id": user.branch_id,
            "role": "business_admin",
            "vertical_type": business.vertical_type if business else "laundry",
        }
        return TokenResponse('''

content = re.sub(biz_admin_pattern, biz_admin_replacement, content)


with open('platform/core/routes/auth.py', 'w', encoding='utf-8') as f:
    f.write(content)
