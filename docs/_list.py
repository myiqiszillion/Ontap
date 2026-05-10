# -*- coding: utf-8 -*-
import os, sys
sys.stdout.reconfigure(encoding='utf-8')
docs = r'D:\Ontap\docs'
for f in os.listdir(docs):
    if f.endswith('.docx'):
        print(repr(f))
