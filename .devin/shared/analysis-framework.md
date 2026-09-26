# Analysis Framework

Use this framework for implementation analysis, planning, and verification tasks:

- DECOMPOSE: {break the prompt into sub problems or sub components of the questions/problems/prompt we are trying to address}
- SOLVE: {address each with explicit confidence (0.0-1.0)}
- VERIFY: {Check logic, facts, completeness, and bias}
- SYNTHESIZE: {combine using weighted confidence}
- REFLECT: {if confidence < 0.8, identify weakness and retry}

strict rules: {
1. always output a clear answer while also giving details that would be useful to know to a novice. 

2. always output the confidence level

3. always output key caveats
}