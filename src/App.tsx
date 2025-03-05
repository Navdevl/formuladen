// @ts-nocheck

import { XIcon } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './components/ui/select';
import Papa from 'papaparse';
import React, { useState } from 'react';

const App = () => {
  const [csvData, setCSVData] = useState(null);
  const [formulaBlocks, setFormulaBlocks] = useState([]);
  const [result, setResult] = useState(null);
  const [interimValues, setInterimValues] = useState([]);
  const [columnTypes, setColumnTypes] = useState({});
  const [uniqueValues, setUniqueValues] = useState({});

  const removeFormulaBlock = (indexToRemove) => {
    setFormulaBlocks(formulaBlocks.filter((_, index) => index !== indexToRemove));
  };


  // Detect column types and unique values
  const detectColumnTypes = (data) => {
    if (!data || data.length === 0) return {};

    const types = {};
    const uniques = {};

    Object.keys(data[0]).forEach(col => {
      // More robust numeric check
      const isNumeric = data.every(row =>
        row[col] === '' || !isNaN(parseFloat(row[col]))
      );
      types[col] = isNumeric ? 'number' : 'string';

      // Get unique values for string columns
      if (types[col] === 'string') {
        uniques[col] = [...new Set(data.map(row => row[col]))];
      }
    });

    setColumnTypes(types);
    setUniqueValues(uniques);
  };

  // Handle CSV file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setCSVData(results.data);
        detectColumnTypes(results.data);
      }
    });
  };

  // Add a new formula block
  const addFormulaBlock = () => {
    setFormulaBlocks([...formulaBlocks, {
      type: 'number',
      value: 0,
      column: '',
      condition: { column: '', operator: '==', value: '' },
      calculation: 'sum',
      operator: '+' // Default operator
    }]);
  };

  // Update a formula block
  const updateFormulaBlock = (index, updates) => {
    const newBlocks = [...formulaBlocks];

    // Handle nested updates for condition
    if (updates.condition) {
      newBlocks[index] = {
        ...newBlocks[index],
        condition: {
          ...newBlocks[index].condition,
          ...updates.condition
        }
      };
    } else {
      newBlocks[index] = { ...newBlocks[index], ...updates };
    }

    // Reset condition value when column changes
    if (updates.condition?.column) {
      newBlocks[index].condition.value = '';
    }

    setFormulaBlocks(newBlocks);
  };

  // Calculate the interim and final value
  const calculateResult = () => {
    if (!csvData) return;

    const calculatedInterimValues = formulaBlocks.map((block, index) => {
      if (block.type === 'number') {
        return block.value;
      }

      // Complex calculation
      const filteredData = csvData.filter(row => {
        const conditionValue = row[block.condition.column];
        switch (block.condition.operator) {
          case '==':
            return conditionValue == block.condition.value;
          case '!=':
            return conditionValue != block.condition.value;
          case '>':
            return parseFloat(conditionValue) > parseFloat(block.condition.value);
          case '<':
            return parseFloat(conditionValue) < parseFloat(block.condition.value);
          default:
            return false;
        }
      });

      const columnValues = filteredData.map(row => parseFloat(row[block.column]) || 0);

      let calculatedValue;
      switch (block.calculation) {
        case 'sum':
          calculatedValue = columnValues.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          calculatedValue = columnValues.length > 0
            ? columnValues.reduce((a, b) => a + b, 0) / columnValues.length
            : 0;
          break;
        default:
          calculatedValue = 0;
      }

      return calculatedValue;
    });

    setInterimValues(calculatedInterimValues);

    // Perform final calculation with correct order of operations
    const finalResult = calculatedInterimValues.reduce((acc, curr, index) => {
      if (index === 0) return curr;

      const operator = formulaBlocks[index - 1].operator || '+';
      switch (operator) {
        case '+': return acc + curr;
        case '-': return acc - curr;
        case '*': return acc * curr;
        case '/': return curr !== 0 ? acc / curr : 0;
        default: return acc;
      }
    });

    setResult(finalResult);
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>CSV Formula Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          {/* File Upload */}
          <div className="mb-4">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="mb-2"
            />
            {csvData && (
              <p className="text-sm text-gray-600">
                Uploaded CSV with {csvData.length} rows
              </p>
            )}
          </div>

          {/* CSV Data Table */}
          {csvData && (
            <div className="mb-4">
              <Card>
                <CardHeader>
                  <CardTitle>CSV Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="max-h-64 overflow-y-auto border rounded"
                  >
                    <table className="w-full">
                      <thead className="sticky top-0 bg-white border-b">
                        <tr>
                          {Object.keys(csvData[0] || {}).map(col => (
                            <th
                              key={col}
                              className="p-2 text-left border-r last:border-r-0"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="even:bg-gray-50 hover:bg-gray-100"
                          >
                            {Object.keys(row).map(col => (
                              <td
                                key={col}
                                className="p-2 border-r last:border-r-0 text-sm"
                              >
                                {row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}


          {/* Formula Blocks */}
          {csvData && (
            <div className="space-y-4 mb-4">
              {formulaBlocks.map((block, index) => (
                <Card key={index} className="p-4">
                  <div className="flex space-x-2 mb-2">
                    {/* Block Type Selection */}
                    <Select
                      value={block.type}
                      onValueChange={(value) => updateFormulaBlock(index, { type: value })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Block Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="complex">Complex</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Number Input or Complex Calculation */}
                    {block.type === 'number' ? (
                      <Input
                        type="number"
                        placeholder="Enter Number"
                        value={block.value}
                        onChange={(e) => updateFormulaBlock(index, { value: parseFloat(e.target.value) })}
                      />
                    ) : (
                      <div className="flex space-x-2 items-center">
                        {/* Condition Column */}
                        <Select
                          value={block.condition.column}
                          onValueChange={(value) => updateFormulaBlock(index, {
                            condition: { column: value, operator: '==', value: '' }
                          })}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Condition Column" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(csvData[0] || {}).map(col => (
                              <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Condition Operator */}
                        {block.condition.column && (
                          <Select
                            value={block.condition.operator}
                            onValueChange={(value) => updateFormulaBlock(index, {
                              condition: { operator: value }
                            })}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue placeholder="Operator" />
                            </SelectTrigger>
                            <SelectContent>
                              {(columnTypes[block.condition.column] === 'string'
                                ? ['==', '!=']
                                : ['==', '!=', '>', '<']
                              ).map(op => (
                                <SelectItem key={op} value={op}>{op}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Condition Value */}
                        {block.condition.column && (
                          columnTypes[block.condition.column] === 'string' ? (
                            <Select
                              value={block.condition.value}
                              onValueChange={(value) => updateFormulaBlock(index, {
                                condition: { value: value }
                              })}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue>{block.condition.value || 'Select Value'}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {(uniqueValues[block.condition.column] || []).map(val => (
                                  <SelectItem key={val} value={val}>{val}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              placeholder="Condition Value"
                              value={block.condition.value}
                              onChange={(e) => updateFormulaBlock(index, {
                                condition: { value: e.target.value }
                              })}
                            />
                          )
                        )}

                        {/* Calculation Type */}
                        <Select
                          value={block.calculation}
                          onValueChange={(value) => updateFormulaBlock(index, { calculation: value })}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Calculation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sum">Sum</SelectItem>
                            <SelectItem value="avg">Average</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Column to Calculate */}
                        <Select
                          value={block.column}
                          onValueChange={(value) => updateFormulaBlock(index, { column: value })}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Calculate Column" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(csvData[0] || {})
                              .filter(col => columnTypes[col] === 'number')
                              .map(col => (
                                <SelectItem key={col} value={col}>{col}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Arithmetic Operator for Next Block */}
                    {index < formulaBlocks.length - 1 && (
                      <Select
                        value={block.operator || '+'}
                        onValueChange={(value) => updateFormulaBlock(index, { operator: value })}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {['+', '-', '*', '/'].map(op => (
                            <SelectItem key={op} value={op}>{op}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Add a remove button */}
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeFormulaBlock(index)}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>

                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {csvData && (
            <div className="flex space-x-2 mb-4">
              <Button onClick={addFormulaBlock}>Add Formula Block</Button>
              <Button onClick={calculateResult}>Calculate</Button>
            </div>
          )}

          {/* Interim and Final Results */}
          {interimValues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Calculation Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2">
                  <h3 className="font-semibold">Interim Values:</h3>
                  {interimValues.map((value, index) => (
                    <p key={index}>Block {index + 1}: {value}</p>
                  ))}
                </div>
                {result !== null && (
                  <div>
                    <h3 className="font-semibold">Final Result:</h3>
                    <p>{result}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default App;