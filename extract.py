import re

with open('backend/app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# We want to extract classes like ReportOverviewResource, ProfitabilityReportResource, etc.
class_names = [
    "ProfitabilityReportResource", "ReportSummaryResource", "ReportDailyTrendResource", 
    "ReportTopItemsResource", "ReportByBranchResource", "ReportAlertsResource", 
    "ReportOverviewResource", "ReportReceivableResource", "ReportClientsDetailResource", "ReportDiscountsResource"
]

import ast

class ClassExtractor(ast.NodeVisitor):
    def __init__(self, names):
        self.names = names
        self.classes = {}
        
    def visit_ClassDef(self, node):
        if node.name in self.names:
            self.classes[node.name] = node
        self.generic_visit(node)

tree = ast.parse(content)
extractor = ClassExtractor(class_names)
extractor.visit(tree)

source_lines = content.splitlines()

extracted = []
for name, node in extractor.classes.items():
    start = node.lineno - 1
    end = node.end_lineno
    class_code = "\n".join(source_lines[start:end])
    extracted.append(class_code)

with open('extracted_reports.py', 'w', encoding='utf-8') as f:
    f.write("\n\n".join(extracted))
