/**
 * aidemy class-code method — demonstrates multi-step method pattern (RFC §8.3).
 *
 * Key showcase:
 *   - `submit` is intentionally NOT implemented (redirect/multi-step methods may omit it)
 *   - Custom Handle exposes step-by-step methods: verifyCode / selectStudent
 *   - State machine: idle → verify → select → token → done
 *   - currentStep drives the UI to render appropriate sub-form
 */
'use client';

import { useState } from 'react';
import { type BaseLoginMethodHandle, defineLoginMethod } from 'swr-login';
import { useAuthInternal } from 'swr-login';

export type ClassCodeStep = 'idle' | 'verify' | 'select' | 'token' | 'done';

export interface Student {
  userId: string;
  name: string;
  avatarUrl?: string;
}

export interface ClassCodeHandle extends BaseLoginMethodHandle<never, never> {
  // submit intentionally omitted — multi-step flow uses custom methods below
  currentStep: ClassCodeStep;
  students: Student[];
  /**
   * Step 1: verify the class code + login code pair.
   * Returns the list of students in this class.
   */
  verifyCode: (input: { classCode: string; loginCode: string }) => Promise<Student[]>;
  /**
   * Step 2: select a student to log in as.
   */
  selectStudent: (userId: string) => Promise<void>;
}

// ─── Mock API helpers ──────────────────────────────────────────

async function mockClassCodeLogin(_input: { classCode: string; loginCode: string }): Promise<{
  classLoginToken: string;
}> {
  await new Promise((res) => setTimeout(res, 500));
  if (_input.classCode === 'ERROR') throw new Error('班级码无效');
  return { classLoginToken: `class-token-${Date.now()}` };
}

async function mockListStudents(_token: string): Promise<Student[]> {
  await new Promise((res) => setTimeout(res, 300));
  return [
    { userId: 'stu-1', name: '张同学', avatarUrl: undefined },
    { userId: 'stu-2', name: '李同学', avatarUrl: undefined },
    { userId: 'stu-3', name: '王同学', avatarUrl: undefined },
  ];
}

async function mockGetStudentToken(_input: {
  userId: string;
  classLoginToken: string;
}): Promise<void> {
  await new Promise((res) => setTimeout(res, 400));
}

// ─── Method definition ─────────────────────────────────────────

export const classCodeMethod = defineLoginMethod<never, never, ClassCodeHandle>({
  id: 'aidemy/class-code',
  meta: {
    label: '班级码登录',
    order: 1,
    slot: 'primary',
    multiStep: true,
    extra: { variants: ['student'] },
  },
  use(): ClassCodeHandle {
    const { refreshSession, publishEvent } = useAuthInternal();
    const [step, setStep] = useState<ClassCodeStep>('idle');
    const [classToken, setClassToken] = useState<string | null>(null);
    const [students, setStudents] = useState<Student[]>([]);

    return {
      // state: compress multi-step into binary idle/pending
      state: step === 'idle' || step === 'done' ? 'idle' : 'pending',
      error: undefined,
      reset: () => {
        setStep('idle');
        setClassToken(null);
        setStudents([]);
      },

      currentStep: step,
      students,

      verifyCode: async ({ classCode, loginCode }) => {
        setStep('verify');
        const { classLoginToken } = await mockClassCodeLogin({ classCode, loginCode });
        const list = await mockListStudents(classLoginToken);
        setClassToken(classLoginToken);
        setStudents(list);
        setStep('select');
        return list;
      },

      selectStudent: async (userId) => {
        if (!classToken) throw new Error('classToken missing; call verifyCode first');
        setStep('token');
        await mockGetStudentToken({ userId, classLoginToken: classToken });
        await refreshSession();
        publishEvent({
          kind: 'login',
          methodId: 'aidemy/class-code',
          payload: { userId },
          timestamp: Date.now(),
        });
        setStep('done');
      },
    };
  },
});
