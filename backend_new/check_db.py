import sqlite3

c = sqlite3.connect("instance/dev.db")

print("tables:", [r[0] for r in c.execute("select name from sqlite_master where type='table' order by name").fetchall()])
print("businesses cols:", [r[1] for r in c.execute("pragma table_info(businesses)").fetchall()])
print("users cols:", [r[1] for r in c.execute("pragma table_info(users)").fetchall()])
print("branches cols:", [r[1] for r in c.execute("pragma table_info(branches)").fetchall()])
print("bio exists:", c.execute("select name from sqlite_master where type='table' and name='branch_item_overrides'").fetchone())

c.close()
