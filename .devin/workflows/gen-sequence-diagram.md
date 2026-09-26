---
description: 
auto_execution_mode: 1
---

Generate a new markdown file in the mentioned {location} where you will generate a sequence diagram of a specified process. The goal is to get specified implementations into a plantUML sequence diagram for better understanding of the process' implementation. 

strict_rule: {IF user wants all diagrams generated, then separate each diagram into its own section}

strict_rule: {markdown file naming convention: {date:Jan_ddyy}_{thing:{process name or feature name}}}

examples of how to use this workflow: {

example for generating a sequence diagram: { 
location: {@DOCS/Real_Time_directory}
context: {files related to this process}
do this for the sequence related to real time messaging
}


