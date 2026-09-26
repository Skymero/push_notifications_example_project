# Component Geometry Tester Implementation Plan

Create a generic, reusable component geometry testing system that measures React Native components and writes results to a text file, re-running automatically when components change.

## Implementation Steps

### 1. Create ComponentGeometryTester Component
- **Location**: `tests/ui-tests/ComponentGeometryTester.jsx`
- **Purpose**: Generic wrapper component that accepts any React element, measures it using `componentGeometry.js`, and writes results to file
- **Key Features**:
  - Accepts `component` prop (any React element)
  - Accepts `componentName` and `outputPath` props for configuration
  - Uses `React.cloneElement` to attach ref to child component
  - Uses `expo-file-system` to write geometry results to file
  - `useEffect` with dependency array to re-run when component changes
  - Outputs JSON format with timestamp, component name, and geometry data

### 2. Create Development-Only Test Screen
- **Location**: `app/__dev__/geometry-tester.jsx`
- **Purpose**: Development screen for testing component geometry
- **Key Features**:
  - Development-only (using `__dev__` directory convention)
  - Example usage with Submit Report button
  - Instructions for adding new components to test
  - Visual display of measured geometry on screen

### 3. Verify expo-file-system Dependency
- **Check**: `expo-file-system` is included in Expo SDK (~54.0.33)
- **Action**: No additional dependency needed (already available in Expo)

### 4. Test with Submit Report Button
- **Location**: Update `app/__dev__/geometry-tester.jsx`
- **Action**: Add CustomButton with ref forwarding to test Submit Report button geometry
- **Verify**: File is written to `tests/testing_results/` with correct format

### 5. Update ChangeLog
- **Location**: `DOCS/ChangeLog.md`
- **Action**: Document the new geometry testing system with usage examples

## Technical Details

### ComponentGeometryTester API
```javascript
<ComponentGeometryTester
  component={<YourComponent />}
  componentName="YourComponent"
  outputPath="testing_results/your-component-geometry.json"
/>
```

### Output Format
```json
{
  "componentName": "YourComponent",
  "timestamp": "2025-10-18T12:00:00.000Z",
  "geometry": {
    "topLeft": { "x": 0, "y": 0 },
    "topRight": { "x": 354, "y": 0 },
    "bottomLeft": { "x": 0, "y": 85 },
    "bottomRight": { "x": 354, "y": 85 },
    "center": { "x": 177, "y": 42.5 },
    "matrix": [[0,0], [354,0], [0,85], [354,85]],
    "dimensions": { "width": 354, "height": 85 }
  }
}
```

### Re-run Behavior
- Component re-measures when `component`, `componentName`, or `outputPath` props change
- Metro hot reload triggers re-render, causing re-measurement
- File is overwritten on each measurement (updates existing file)

## Notes
- Requires React Native runtime (cannot run in pure Node.js)
- File system writes use `expo-file-system` (built into Expo SDK)
- Development-only screen will not ship to production
- Generic design allows testing any component without modification
