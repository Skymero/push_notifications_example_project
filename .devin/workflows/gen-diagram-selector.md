---
description: for generating diagrams of a specific process
auto_execution_mode: 3
---

Generate a new markdown file in the mentioned {location} where you will add the specified diagram {number}. The goal is to get specified implementations into plantUML for better understanding of the process' implementation. 

strict_rule: {IF user wants all diagrams generated, then separate each diagram into its own section}

strict_rule: {markdown file naming convention: {date:ddmmyy}_{thing:{process name or feature name}}}

examples of how to use this workflow: {

example for generating a sequence diagram: { 
location: {@DOCS/Real_Time_directory}
diagram: {1}
context: {files related to this process}
do this for the sequence related to real time messaging
}

example of generating multiple diagrams with a sequence dagram AND an object diagram: { 
location: {@DOCS/Real_Time_directory}
diagram: {1,8}
context: {files related to this process}
do this for the sequence related to real time messaging
}

example for generating all diagrams listed in "Diagrams": {
location: {@DOCS/Real_Time_directory}
diagram: {0}
context: {files related to this process}

}
Diagrams: {

0. Generate: Sequence diagram, activity diagram, ER diagram, Data flow diagram as described above. 

1. Sequence Diagram: Visualize the order of messages exchanged between objects over time, useful for understanding interactions.

2. Class Diagram: Represent the static structure of a system, detailing classes, attributes, operations, and relationships.

3. Use Case Diagram: Illustrate interactions between actors (users or other systems) and the system's functionalities.

4. Activity Diagram: Represent workflows, processes, and the dynamic behavior of a system, similar to flowcharts.

5. Component Diagram: Show the organization and dependencies of software components.

6. Deployment Diagram: Depict the physical deployment of software components on hardware nodes.

7. State Machine Diagram: Model the behavior of objects as they transition between states in response to events.

8. Object Diagram: Represent specific instances of classes and their relationships at a given moment.

9. Timing Diagram: Visualize the timing and duration of events and interactions, helpful for understanding performance aspects.

10. Communication Diagram: Show message exchange between components, providing a broader view of system interactions.

11. Composite Structure Diagram: Illustrate the internal structure of a class, including its parts, interfaces, and collaborations.

12. Package Diagram: Organize elements into groups (packages) to manage system architecture.

13. Flowchart: Maps processes and workflows Using standardized symbols and connectors, flowcharts provide a clear and logical representation of sequential steps and decision points. They help identify bottlenecks, streamline operations, and improve overall efficiency.

14. ER Diagram: {extract all entities (collections), their attributes, and relationships. Format the output as a PlantUML Entity–Relationship Diagram where:{
- Each entity represents an Appwrite collection.
- Use the format: attributeName: type <<PK>> for primary keys, <<FK -> Entity.attribute>> for foreign keys.
- Include multiplicities (||--o{) to represent one-to-many relationships and o{--o{ for many-to-many.
- Include array types as array(type).
- Mark special constraints in curly braces: {required}, {unique}.
- Assume Appwrite auto-generates `$id` for documents unless my code defines a custom id.
- Only include attributes actually needed by the code/features described.

After the diagram, provide:
1. A short explanation of each entity’s purpose.
2. A summary of relationships in plain language.

Example PlantUML syntax for reference:
@startuml
entity "User" {
  * id: string <<PK>>
  email: string {unique}
}
entity "Post" {
  * id: string <<PK>>
  authorId: string <<FK -> User.id>>
}
User ||--o{ Post : authors
@enduml

}
}

15. Block diagrams: Visualizing components and connections. Block diagrams illustrate the relationship between different components of a system or process. They provide a high-level overview of the system's structure by using blocks to represent individual components and their interconnections. Block diagrams are commonly used in engineering, electronics, and system design.

16. Data flow diagrams: Analyzing information flow. Data flow diagrams (DFDs) illustrate how data flows within a system. These diagrams focus on the way data moves through a system, from input to processing and then to output. They are widely used in systems analysis, software development, and business process modeling.


}


file name format: {three letters of the current month}_{day}_{year}_{Process name}