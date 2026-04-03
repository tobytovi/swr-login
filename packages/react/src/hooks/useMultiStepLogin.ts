import type { AuthResponse } from '@swr-login/core';
import { useCallback, useRef, useState } from 'react';
import { useAuthContext } from '../context';

export interface UseMultiStepLoginReturn<TCredentials = unknown> {
  /** 当前步骤索引（从 0 开始，-1 表示未开始） */
  currentStep: number;
  /** 当前步骤名称（未开始时为 null） */
  currentStepName: string | null;
  /** 总步骤数 */
  totalSteps: number;
  /** 启动流程（执行第一步） */
  start: (credentials: TCredentials) => Promise<void>;
  /** 继续下一步 */
  next: (input: unknown) => Promise<void>;
  /** 回到上一步（仅 UI 层回退，不重新执行步骤逻辑） */
  back: () => void;
  /** 取消整个流程，重置状态 */
  cancel: () => void;
  /** 当前步骤的输出数据（传给 UI 渲染） */
  stepData: unknown;
  /** 是否正在执行当前步骤 */
  isLoading: boolean;
  /** 当前步骤的错误 */
  error: Error | null;
  /** 重置错误状态 */
  reset: () => void;
  /** 流程是否已完成 */
  isComplete: boolean;
  /** 最终的 AuthResponse（流程完成后可用） */
  authResponse: AuthResponse | null;
}

/**
 * Hook 用于驱动多步骤登录插件的流程。
 *
 * 提供步骤状态管理、前进/后退/取消等操作，自动在最后一步完成后
 * 调用 finalizeAuth 并更新全局登录态。
 *
 * @param pluginName - 多步骤插件名称
 *
 * @example
 * ```tsx
 * function ClassCodeLoginFlow() {
 *   const {
 *     currentStepName, stepData, start, next, back, isLoading, error, isComplete,
 *   } = useMultiStepLogin<{ classCode: string; loginCode: string }>('class-code');
 *
 *   if (isComplete) {
 *     return <Redirect to="/dashboard" />;
 *   }
 *
 *   // 步骤 1：输入班级码
 *   if (currentStepName === 'verify-code' || currentStep === -1) {
 *     return <ClassCodeForm onSubmit={start} isLoading={isLoading} error={error} />;
 *   }
 *
 *   // 步骤 2：选择学生
 *   if (currentStepName === 'select-student') {
 *     return (
 *       <StudentList
 *         students={stepData.students}
 *         onSelect={(userId) => next({ userId, classLoginToken: stepData.classLoginToken })}
 *         onBack={back}
 *         isLoading={isLoading}
 *       />
 *     );
 *   }
 *
 *   // 步骤 3：获取 Token（自动执行，显示 loading）
 *   if (currentStepName === 'get-token') {
 *     return <LoadingSpinner text="登录中..." />;
 *   }
 * }
 * ```
 */
export function useMultiStepLogin<TCredentials = unknown>(
  pluginName: string,
): UseMultiStepLoginReturn<TCredentials> {
  const { pluginManager, stateMachine, config } = useAuthContext();

  const [currentStep, setCurrentStep] = useState(-1); // -1 表示未开始
  const [stepData, setStepData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [authResponse, setAuthResponse] = useState<AuthResponse | null>(null);

  // 用 ref 保存中间步骤的累积数据，避免闭包问题
  const stepOutputsRef = useRef<unknown[]>([]);

  const steps = pluginManager.getSteps(pluginName);
  const totalSteps = steps?.length ?? 0;

  const currentStepName = currentStep >= 0 && steps ? (steps[currentStep]?.name ?? null) : null;

  const executeStepAt = useCallback(
    async (stepIndex: number, input: unknown) => {
      setIsLoading(true);
      setError(null);

      try {
        const output = await pluginManager.executeStep(pluginName, stepIndex, input);
        stepOutputsRef.current[stepIndex] = output;
        setStepData(output);
        setCurrentStep(stepIndex);

        // 如果是最后一步，执行 finalizeAuth
        if (stepIndex === totalSteps - 1) {
          const response = await pluginManager.finalizeMultiStep(pluginName, output);
          stateMachine.transition('authenticated');

          if (config.cacheAdapter) {
            await config.cacheAdapter.setUser(response.user);
          }

          setAuthResponse(response);
          setIsComplete(true);
        }
      } catch (err) {
        const authError = err instanceof Error ? err : new Error('Step execution failed');
        setError(authError);
        throw authError;
      } finally {
        setIsLoading(false);
      }
    },
    [pluginManager, pluginName, totalSteps, stateMachine, config],
  );

  const start = useCallback(
    async (credentials: TCredentials) => {
      // 重置状态
      stepOutputsRef.current = [];
      setCurrentStep(-1);
      setStepData(null);
      setIsComplete(false);
      setAuthResponse(null);
      setError(null);
      stateMachine.transition('authenticating');

      await executeStepAt(0, credentials);
    },
    [executeStepAt, stateMachine],
  );

  const next = useCallback(
    async (input: unknown) => {
      const nextIndex = currentStep + 1;
      if (nextIndex >= totalSteps) {
        throw new Error('[swr-login] No more steps to execute.');
      }
      await executeStepAt(nextIndex, input);
    },
    [currentStep, totalSteps, executeStepAt],
  );

  const back = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      setStepData(stepOutputsRef.current[prevStep] ?? null);
      setError(null);
    }
  }, [currentStep]);

  const cancel = useCallback(() => {
    setCurrentStep(-1);
    setStepData(null);
    setIsLoading(false);
    setError(null);
    setIsComplete(false);
    setAuthResponse(null);
    stepOutputsRef.current = [];
    stateMachine.transition('unauthenticated');
  }, [stateMachine]);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    currentStep,
    currentStepName,
    totalSteps,
    start,
    next,
    back,
    cancel,
    stepData,
    isLoading,
    error,
    reset,
    isComplete,
    authResponse,
  };
}
