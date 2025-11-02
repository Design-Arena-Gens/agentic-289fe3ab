'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { javascriptGenerator, Order } from 'blockly/javascript';
import { StageView, type StageSnapshot, type TrailSegment } from './StageView';

const ELECTROFIRE_TOOLBOX = `
<xml style="display: none">
  <category name="Events" colour="#facc15">
    <block type="ef_events_start"></block>
  </category>
  <category name="Motion" colour="#3b82f6">
    <block type="ef_motion_move">
      <value name="STEPS"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
    </block>
    <block type="ef_motion_turn_right">
      <value name="DEGREES"><shadow type="math_number"><field name="NUM">15</field></shadow></value>
    </block>
    <block type="ef_motion_turn_left">
      <value name="DEGREES"><shadow type="math_number"><field name="NUM">15</field></shadow></value>
    </block>
    <block type="ef_motion_goto">
      <value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="ef_motion_point">
      <value name="DIRECTION"><shadow type="math_number"><field name="NUM">90</field></shadow></value>
    </block>
    <block type="ef_motion_changex">
      <value name="DX"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
    </block>
    <block type="ef_motion_changey">
      <value name="DY"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
    </block>
  </category>
  <category name="Looks" colour="#a855f7">
    <block type="ef_looks_say">
      <value name="MESSAGE"><shadow type="text"><field name="TEXT">Hello ElectroFire!</field></shadow></value>
      <value name="SECS"><shadow type="math_number"><field name="NUM">1.5</field></shadow></value>
    </block>
    <block type="ef_looks_color">
      <value name="COLOR"><shadow type="text"><field name="TEXT">#22d3ee</field></shadow></value>
    </block>
    <block type="ef_looks_background">
      <value name="COLOR"><shadow type="text"><field name="TEXT">radial-gradient(circle at top, #f97316 0%, #7c3aed 60%, #0f172a 100%)</field></shadow></value>
    </block>
  </category>
  <category name="Pen" colour="#14b8a6">
    <block type="ef_pen_down"></block>
    <block type="ef_pen_up"></block>
    <block type="ef_pen_color">
      <value name="COLOR"><shadow type="text"><field name="TEXT">#22d3ee</field></shadow></value>
    </block>
    <block type="ef_pen_clear"></block>
  </category>
  <category name="Control" colour="#f97316">
    <block type="ef_control_repeat">
      <value name="TIMES"><shadow type="math_number"><field name="NUM">4</field></shadow></value>
    </block>
    <block type="ef_control_wait">
      <value name="SECS"><shadow type="math_number"><field name="NUM">0.5</field></shadow></value>
    </block>
  </category>
  <category name="Math" colour="#10b981">
    <block type="math_number"></block>
    <block type="math_arithmetic"></block>
    <block type="math_random_int"></block>
  </category>
</xml>
`;

const INITIAL_EXAMPLE = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="ef_events_start" x="30" y="40">
    <next>
      <block type="ef_pen_clear">
        <next>
          <block type="ef_pen_down">
            <next>
              <block type="ef_control_repeat">
                <value name="TIMES">
                  <shadow type="math_number">
                    <field name="NUM">24</field>
                  </shadow>
                </value>
                <statement name="DO">
                  <block type="ef_motion_move">
                    <value name="STEPS">
                      <shadow type="math_number">
                        <field name="NUM">20</field>
                      </shadow>
                    </value>
                    <next>
                      <block type="ef_motion_turn_right">
                        <value name="DEGREES">
                          <shadow type="math_number">
                            <field name="NUM">165</field>
                          </shadow>
                        </value>
                      </block>
                    </next>
                  </block>
                </statement>
                <next>
                  <block type="ef_pen_up">
                    <next>
                      <block type="ef_looks_say">
                        <value name="MESSAGE">
                          <shadow type="text">
                            <field name="TEXT">ElectroFire is alive! ⚡</field>
                          </shadow>
                        </value>
                        <value name="SECS">
                          <shadow type="math_number">
                            <field name="NUM">1.25</field>
                          </shadow>
                        </value>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>
`;

type LogEntry = {
  id: string;
  text: string;
  tone: 'info' | 'error';
};

const DEFAULT_STAGE: StageSnapshot = {
  x: 0,
  y: 0,
  direction: 90,
  spriteColor: '#38bdf8',
  penDown: false,
  penColor: '#22d3ee',
  background: 'linear-gradient(135deg, #020617 0%, #0f172a 60%, #1e293b 100%)',
  message: null,
  trails: []
};

function registerElectroFireBlocks() {
  if (Blockly.Blocks['ef_motion_move']) {
    return;
  }

  Blockly.defineBlocksWithJsonArray([
    {
      type: 'ef_events_start',
      message0: 'when ElectroFire starts',
      nextStatement: null,
      colour: '#facc15',
      tooltip: 'Run the connected blocks when the ElectroFire editor starts your project.',
      helpUrl: ''
    },
    {
      type: 'ef_motion_move',
      message0: 'move %1 steps',
      args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#3b82f6',
      tooltip: 'Move the sprite forward in the direction it is facing.',
      helpUrl: ''
    },
    {
      type: 'ef_motion_turn_right',
      message0: 'turn right %1 degrees',
      args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#3b82f6',
      tooltip: 'Rotate clockwise.',
      helpUrl: ''
    },
    {
      type: 'ef_motion_turn_left',
      message0: 'turn left %1 degrees',
      args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#3b82f6',
      tooltip: 'Rotate counter-clockwise.',
      helpUrl: ''
    },
    {
      type: 'ef_motion_goto',
      message0: 'go to x %1 y %2',
      args0: [
        { type: 'input_value', name: 'X', check: 'Number' },
        { type: 'input_value', name: 'Y', check: 'Number' }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#3b82f6',
      tooltip: 'Instantly teleport to a position on the stage.',
      helpUrl: ''
    },
    {
      type: 'ef_motion_point',
      message0: 'point in direction %1',
      args0: [{ type: 'input_value', name: 'DIRECTION', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#3b82f6',
      tooltip: 'Set the facing direction.',
      helpUrl: ''
    },
    {
      type: 'ef_motion_changex',
      message0: 'change x by %1',
      args0: [{ type: 'input_value', name: 'DX', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#3b82f6',
      tooltip: 'Shift horizontally.',
      helpUrl: ''
    },
    {
      type: 'ef_motion_changey',
      message0: 'change y by %1',
      args0: [{ type: 'input_value', name: 'DY', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#3b82f6',
      tooltip: 'Shift vertically.',
      helpUrl: ''
    },
    {
      type: 'ef_looks_say',
      message0: 'say %1 for %2 seconds',
      args0: [
        { type: 'input_value', name: 'MESSAGE', check: 'String' },
        { type: 'input_value', name: 'SECS', check: 'Number' }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#a855f7',
      tooltip: 'Show a message bubble.',
      helpUrl: ''
    },
    {
      type: 'ef_looks_color',
      message0: 'set sprite color to %1',
      args0: [{ type: 'input_value', name: 'COLOR', check: 'String' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#a855f7',
      tooltip: 'Change the ElectroFire sprite color.',
      helpUrl: ''
    },
    {
      type: 'ef_looks_background',
      message0: 'set background to %1',
      args0: [{ type: 'input_value', name: 'COLOR', check: 'String' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#a855f7',
      tooltip: 'Change the stage background (supports gradients).',
      helpUrl: ''
    },
    {
      type: 'ef_control_repeat',
      message0: 'repeat %1 times %2',
      args0: [
        { type: 'input_value', name: 'TIMES', check: 'Number' },
        {
          type: 'input_statement',
          name: 'DO'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#f97316',
      tooltip: 'Repeat the contained blocks.',
      helpUrl: ''
    },
    {
      type: 'ef_control_wait',
      message0: 'wait %1 seconds',
      args0: [{ type: 'input_value', name: 'SECS', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#f97316',
      tooltip: 'Pause the program.',
      helpUrl: ''
    },
    {
      type: 'ef_pen_down',
      message0: 'pen down',
      previousStatement: null,
      nextStatement: null,
      colour: '#14b8a6',
      tooltip: 'Start drawing when moving.',
      helpUrl: ''
    },
    {
      type: 'ef_pen_up',
      message0: 'pen up',
      previousStatement: null,
      nextStatement: null,
      colour: '#14b8a6',
      tooltip: 'Stop drawing when moving.',
      helpUrl: ''
    },
    {
      type: 'ef_pen_color',
      message0: 'set pen color to %1',
      args0: [{ type: 'input_value', name: 'COLOR', check: 'String' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#14b8a6',
      tooltip: 'Change the trail color.',
      helpUrl: ''
    },
    {
      type: 'ef_pen_clear',
      message0: 'clear trails',
      previousStatement: null,
      nextStatement: null,
      colour: '#14b8a6',
      tooltip: 'Remove all drawings from the stage.',
      helpUrl: ''
    }
  ]);

  javascriptGenerator.forBlock['ef_events_start'] = function (block) {
    const nextBlock = block.getNextBlock();
    if (!nextBlock) {
      return '';
    }
    const nextCode = javascriptGenerator.blockToCode(nextBlock);
    return Array.isArray(nextCode) ? nextCode[0] : nextCode;
  };

  javascriptGenerator.forBlock['ef_motion_move'] = function (block) {
    const steps = javascriptGenerator.valueToCode(block, 'STEPS', Order.NONE) || '10';
    return `await move(${steps});\n`;
  };

  javascriptGenerator.forBlock['ef_motion_turn_right'] = function (block) {
    const degrees = javascriptGenerator.valueToCode(block, 'DEGREES', Order.NONE) || '15';
    return `await turn(${degrees});\n`;
  };

  javascriptGenerator.forBlock['ef_motion_turn_left'] = function (block) {
    const degrees = javascriptGenerator.valueToCode(block, 'DEGREES', Order.NONE) || '15';
    return `await turn(-1 * (${degrees}));\n`;
  };

  javascriptGenerator.forBlock['ef_motion_goto'] = function (block) {
    const xCode = javascriptGenerator.valueToCode(block, 'X', Order.NONE) || '0';
    const yCode = javascriptGenerator.valueToCode(block, 'Y', Order.NONE) || '0';
    return `await goTo(${xCode}, ${yCode});\n`;
  };

  javascriptGenerator.forBlock['ef_motion_point'] = function (block) {
    const code = javascriptGenerator.valueToCode(block, 'DIRECTION', Order.NONE) || '90';
    return `await pointInDirection(${code});\n`;
  };

  javascriptGenerator.forBlock['ef_motion_changex'] = function (block) {
    const dx = javascriptGenerator.valueToCode(block, 'DX', Order.NONE) || '10';
    return `await changeX(${dx});\n`;
  };

  javascriptGenerator.forBlock['ef_motion_changey'] = function (block) {
    const dy = javascriptGenerator.valueToCode(block, 'DY', Order.NONE) || '10';
    return `await changeY(${dy});\n`;
  };

  javascriptGenerator.forBlock['ef_looks_say'] = function (block) {
    const message = javascriptGenerator.valueToCode(block, 'MESSAGE', Order.NONE) || "''";
    const secs = javascriptGenerator.valueToCode(block, 'SECS', Order.NONE) || '2';
    return `await say(${message}, ${secs});\n`;
  };

  javascriptGenerator.forBlock['ef_looks_color'] = function (block) {
    const color = javascriptGenerator.valueToCode(block, 'COLOR', Order.NONE) || "'#38bdf8'";
    return `await setSpriteColor(${color});\n`;
  };

  javascriptGenerator.forBlock['ef_looks_background'] = function (block) {
    const color = javascriptGenerator.valueToCode(block, 'COLOR', Order.NONE) || "'#0f172a'";
    return `await setBackground(${color});\n`;
  };

  javascriptGenerator.forBlock['ef_control_repeat'] = function (block) {
    const times = javascriptGenerator.valueToCode(block, 'TIMES', Order.NONE) || '0';
    const branch = javascriptGenerator.statementToCode(block, 'DO');
    const loopVar =
      (javascriptGenerator.nameDB_?.getDistinctName('i', Blockly.Names.NameType.VARIABLE) as string | undefined) ?? 'i';
    return `for (let ${loopVar} = 0; ${loopVar} < ${times}; ${loopVar}++) {\n${branch}}\n`;
  };

  javascriptGenerator.forBlock['ef_control_wait'] = function (block) {
    const secs = javascriptGenerator.valueToCode(block, 'SECS', Order.NONE) || '0.5';
    return `await wait(${secs});\n`;
  };

  javascriptGenerator.forBlock['ef_pen_down'] = function () {
    return `await penDown();\n`;
  };

  javascriptGenerator.forBlock['ef_pen_up'] = function () {
    return `await penUp();\n`;
  };

  javascriptGenerator.forBlock['ef_pen_color'] = function (block) {
    const color = javascriptGenerator.valueToCode(block, 'COLOR', Order.NONE) || "'#22d3ee'";
    return `await setPenColor(${color});\n`;
  };

  javascriptGenerator.forBlock['ef_pen_clear'] = function () {
    return `await clearTrails();\n`;
  };
}

export const ElectroFireStudio = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [stageSnapshot, setStageSnapshot] = useState<StageSnapshot>(DEFAULT_STAGE);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [codePreview, setCodePreview] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef(0);

  registerElectroFireBlocks();

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const workspace = Blockly.inject(containerRef.current, {
      toolbox: ELECTROFIRE_TOOLBOX,
      trashcan: true,
      renderer: 'zelos',
      theme: Blockly.Theme.defineTheme('electrofire', {
        name: 'electrofire',
        base: Blockly.Themes.Classic,
        blockStyles: {
          motion_blocks: {
            colourPrimary: '#3b82f6',
            colourSecondary: '#60a5fa',
            colourTertiary: '#1d4ed8'
          },
          looks_blocks: {
            colourPrimary: '#a855f7',
            colourSecondary: '#c084fc',
            colourTertiary: '#6d28d9'
          },
          control_blocks: {
            colourPrimary: '#f97316',
            colourSecondary: '#fb923c',
            colourTertiary: '#ea580c'
          },
          events_blocks: {
            colourPrimary: '#facc15',
            colourSecondary: '#fde047',
            colourTertiary: '#ca8a04'
          },
          pen_blocks: {
            colourPrimary: '#14b8a6',
            colourSecondary: '#2dd4bf',
            colourTertiary: '#0f766e'
          }
        },
        categoryStyles: {
          motion: { colour: '#3b82f6' },
          looks: { colour: '#a855f7' },
          control: { colour: '#f97316' },
          events: { colour: '#facc15' },
          pen: { colour: '#14b8a6' }
        },
        componentStyles: {
          toolboxBackgroundColour: '#0f172a',
          toolboxForegroundColour: '#e2e8f0',
          flyoutBackgroundColour: '#111827',
          flyoutForegroundColour: '#e2e8f0',
          flyoutOpacity: 0.9,
          scrollbarColour: '#334155',
          scrollbarOpacity: 0.7
        }
      })
    });

    workspaceRef.current = workspace;

    const xml = Blockly.utils.xml.textToDom(INITIAL_EXAMPLE);
    Blockly.Xml.domToWorkspace(xml, workspace);

    const updatePreview = () => {
      const code = javascriptGenerator.workspaceToCode(workspace);
      setCodePreview(code);
    };

    workspace.addChangeListener(updatePreview);
    updatePreview();

    return () => {
      workspace.removeChangeListener(updatePreview);
      workspace.dispose();
    };
  }, []);

  const stageAPI = useMemo(() => {
    const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

    return {
      move: async (steps: number) => {
        setStageSnapshot((prev) => {
          const radians = (prev.direction * Math.PI) / 180;
          const dx = steps * Math.cos(radians);
          const dy = steps * Math.sin(radians);
          const nextX = clamp(prev.x + dx, -240, 240);
          const nextY = clamp(prev.y + dy, -180, 180);
          const newTrails: TrailSegment[] = prev.trails;

          let updatedTrails = newTrails;
          if (prev.penDown) {
            const segment: TrailSegment = {
              id: `${Date.now()}-${Math.random()}`,
              from: { x: prev.x, y: prev.y },
              to: { x: nextX, y: nextY },
              color: prev.penColor
            };
            updatedTrails = [...newTrails, segment];
          }

          return {
            ...prev,
            x: nextX,
            y: nextY,
            trails: updatedTrails
          };
        });
        await new Promise((resolve) => setTimeout(resolve, 120));
      },
      turn: async (degrees: number) => {
        setStageSnapshot((prev) => ({
          ...prev,
          direction: (prev.direction + degrees + 360) % 360
        }));
        await new Promise((resolve) => setTimeout(resolve, 60));
      },
      goTo: async (x: number, y: number) => {
        setStageSnapshot((prev) => ({
          ...prev,
          x: clamp(x, -240, 240),
          y: clamp(y, -180, 180)
        }));
        await new Promise((resolve) => setTimeout(resolve, 80));
      },
      changeX: async (delta: number) => {
        setStageSnapshot((prev) => ({
          ...prev,
          x: clamp(prev.x + delta, -240, 240)
        }));
        await new Promise((resolve) => setTimeout(resolve, 80));
      },
      changeY: async (delta: number) => {
        setStageSnapshot((prev) => ({
          ...prev,
          y: clamp(prev.y + delta, -180, 180)
        }));
        await new Promise((resolve) => setTimeout(resolve, 80));
      },
      pointInDirection: async (degrees: number) => {
        setStageSnapshot((prev) => ({
          ...prev,
          direction: ((degrees % 360) + 360) % 360
        }));
        await new Promise((resolve) => setTimeout(resolve, 60));
      },
      say: async (message: string, secs: number) => {
        setStageSnapshot((prev) => ({
          ...prev,
          message
        }));
        await new Promise((resolve) => setTimeout(resolve, Math.max(secs * 1000, 100)));
        setStageSnapshot((prev) => ({
          ...prev,
          message: null
        }));
      },
      setSpriteColor: async (color: string) => {
        setStageSnapshot((prev) => ({
          ...prev,
          spriteColor: color
        }));
      },
      setBackground: async (background: string) => {
        setStageSnapshot((prev) => ({
          ...prev,
          background
        }));
      },
      wait: async (secs: number) => {
        await new Promise((resolve) => setTimeout(resolve, Math.max(secs * 1000, 0)));
      },
      penDown: async () => {
        setStageSnapshot((prev) => ({
          ...prev,
          penDown: true
        }));
      },
      penUp: async () => {
        setStageSnapshot((prev) => ({
          ...prev,
          penDown: false
        }));
      },
      setPenColor: async (color: string) => {
        setStageSnapshot((prev) => ({
          ...prev,
          penColor: color
        }));
      },
      clearTrails: async () => {
        setStageSnapshot((prev) => ({
          ...prev,
          trails: []
        }));
      },
      log: (message: string) => {
        const id = `${Date.now()}-${Math.random()}`;
        setLog((prev) => [{ id, text: message, tone: 'info' as const }, ...prev].slice(0, 50));
      }
    };
  }, []);

  const resetStage = () => {
    setStageSnapshot({ ...DEFAULT_STAGE, trails: [] });
    setLog([]);
    setError(null);
  };

  const runProgram = async () => {
    if (isRunning) {
      return;
    }
    const workspace = workspaceRef.current;
    if (!workspace) {
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    setIsRunning(true);
    setError(null);
    setLog([]);
    resetStage();

    const generatedCode = javascriptGenerator.workspaceToCode(workspace);
    setCodePreview(generatedCode);

    const runner = new Function(
      'api',
      `
      const {
        move,
        turn,
        goTo,
        changeX,
        changeY,
        pointInDirection,
        say,
        wait,
        setSpriteColor,
        setBackground,
        penDown,
        penUp,
        setPenColor,
        clearTrails,
        log
      } = api;
      return (async () => {
        ${generatedCode}
      })();
    `
    );

    try {
      await runner({
        ...stageAPI,
        wait: stageAPI.wait,
        move: stageAPI.move,
        turn: stageAPI.turn,
        goTo: stageAPI.goTo,
        changeX: stageAPI.changeX,
        changeY: stageAPI.changeY,
        pointInDirection: stageAPI.pointInDirection,
        say: stageAPI.say,
        setSpriteColor: stageAPI.setSpriteColor,
        setBackground: stageAPI.setBackground,
        penDown: stageAPI.penDown,
        penUp: stageAPI.penUp,
        setPenColor: stageAPI.setPenColor,
        clearTrails: stageAPI.clearTrails,
        log: stageAPI.log
      });
      if (runIdRef.current !== runId) {
        return;
      }
    setLog((prev) => [{ id: `${Date.now()}`, text: 'Program finished.', tone: 'info' as const }, ...prev]);
    } catch (err) {
      console.error(err);
      if (runIdRef.current !== runId) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setLog((prev) => [{ id: `${Date.now()}`, text: message, tone: 'error' as const }, ...prev]);
    } finally {
      if (runIdRef.current === runId) {
        setIsRunning(false);
      }
    }
  };

  const stopProgram = () => {
    runIdRef.current += 1;
    setIsRunning(false);
    setLog((prev) => [{ id: `${Date.now()}`, text: 'Program stopped.', tone: 'info' as const }, ...prev]);
  };

  const saveProject = () => {
    const workspace = workspaceRef.current;
    if (!workspace) {
      return;
    }
    const xml = Blockly.Xml.workspaceToDom(workspace);
    const xmlText = Blockly.Xml.domToPrettyText(xml);
    const blob = new Blob([xmlText], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'electrofire-project.xml';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const loadProject = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result?.toString();
      if (!content) {
        event.target.value = '';
        return;
      }
      try {
        const dom = Blockly.utils.xml.textToDom(content);
        const workspace = workspaceRef.current;
        if (!workspace) {
          event.target.value = '';
          return;
        }
        workspace.clear();
        Blockly.Xml.domToWorkspace(dom, workspace);
        setLog((prev) => [{ id: `${Date.now()}`, text: `Loaded ${file.name}`, tone: 'info' as const }, ...prev]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load project';
        setError(message);
        setLog((prev) => [{ id: `${Date.now()}`, text: message, tone: 'error' as const }, ...prev]);
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(380px, 1fr) 520px',
        gap: 28,
        width: '100%',
        maxWidth: 1400
      }}
    >
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.86)',
          borderRadius: 32,
          border: '1px solid rgba(148, 163, 184, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backdropFilter: 'blur(14px)',
          minHeight: 720,
          boxShadow: '0 30px 80px rgba(8, 47, 73, 0.65)'
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 26px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
            gap: 16
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, margin: 0 }}>ElectroFire Studio</h1>
            <p style={{ margin: 0, opacity: 0.75, fontSize: 14 }}>
              A Scratch-inspired playground for explosive creativity.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={runProgram}
              disabled={isRunning}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: 'none',
                background: isRunning ? '#475569' : '#22c55e',
                color: '#0f172a',
                fontWeight: 600,
                cursor: isRunning ? 'not-allowed' : 'pointer',
                boxShadow: '0 10px 20px rgba(34, 197, 94, 0.25)',
                transition: 'transform 0.15s ease'
              }}
            >
              ▶ Run
            </button>
            <button
              type="button"
              onClick={stopProgram}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: '1px solid rgba(148, 163, 184, 0.35)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#e2e8f0',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              ■ Stop
            </button>
            <button
              type="button"
              onClick={resetStage}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: '1px solid rgba(148, 163, 184, 0.35)',
                background: '#0f172a',
                color: '#e2e8f0',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              ↺ Reset
            </button>
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div
            ref={containerRef}
            style={{
              flex: 1,
              minHeight: 0
            }}
          />
        </div>

        <footer
          style={{
            padding: '18px 26px',
            borderTop: '1px solid rgba(148, 163, 184, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <label
              style={{
                borderRadius: 999,
                border: '1px solid rgba(148, 163, 184, 0.35)',
                background: 'rgba(15, 23, 42, 0.7)',
                color: '#e2e8f0',
                padding: '10px 18px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              ⬆ Import Blocks
              <input
                type="file"
                accept=".xml"
                onChange={loadProject}
                style={{ display: 'none' }}
              />
            </label>
            <button
              type="button"
              onClick={saveProject}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: '1px solid rgba(148, 163, 184, 0.35)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#e2e8f0',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              ⬇ Export Blocks
            </button>
          </div>
          <span style={{ fontSize: 13, opacity: 0.6 }}>Drag blocks, remix them, and press Run.</span>
        </footer>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr',
          gap: 18
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.86)',
            borderRadius: 28,
            border: '1px solid rgba(148, 163, 184, 0.35)',
            padding: 20,
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.55)'
          }}
        >
          <StageView snapshot={stageSnapshot} />
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.86)',
            borderRadius: 28,
            border: '1px solid rgba(148, 163, 184, 0.35)',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Generated ElectroScript</strong>
            <span style={{ fontSize: 12, opacity: 0.65 }}>A friendly JavaScript remix of your blocks</span>
          </header>
          <pre
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              borderRadius: 20,
              padding: 16,
              minHeight: 160,
              maxHeight: 220,
              overflow: 'auto',
              border: '1px solid rgba(148, 163, 184, 0.25)'
            }}
          >
            <code>{codePreview.trim() ? codePreview : '// drop blocks to see the magic'}</code>
          </pre>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.86)',
            borderRadius: 28,
            border: '1px solid rgba(148, 163, 184, 0.35)',
            padding: '16px 18px',
            minHeight: 120,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>ElectroFire Console</strong>
            {error ? (
              <span style={{ fontSize: 12, color: '#f87171' }}>⚠ {error}</span>
            ) : (
              <span style={{ fontSize: 12, opacity: 0.6 }}>Status: {isRunning ? 'Running…' : 'Idle'}</span>
            )}
          </header>
          <div
            style={{
              borderRadius: 16,
              background: 'rgba(2, 6, 23, 0.65)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              padding: 12,
              minHeight: 100,
              maxHeight: 180,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            {log.length === 0 ? (
              <span style={{ fontSize: 12, opacity: 0.6 }}>Console output appears here.</span>
            ) : (
              log.map((entry) => (
                <span
                  key={entry.id}
                  style={{
                    fontSize: 12,
                    color: entry.tone === 'error' ? '#f87171' : '#f8fafc',
                    background: entry.tone === 'error' ? 'rgba(153, 27, 27, 0.25)' : 'rgba(15, 23, 42, 0.4)',
                    borderRadius: 12,
                    padding: '6px 10px',
                    border:
                      entry.tone === 'error'
                        ? '1px solid rgba(248, 113, 113, 0.35)'
                        : '1px solid rgba(148, 163, 184, 0.25)'
                  }}
                >
                  {entry.text}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
