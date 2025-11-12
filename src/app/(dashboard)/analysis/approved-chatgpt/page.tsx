"use client";
import React, { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { updateStateArray } from "@/store/features/user/userSlice";
import { SummaryStatistics } from "@/components/common/SummaryStatistics";
import MultiSelect from "@/components/form/MultiSelect";

interface State {
	id: number;
	name: string;
}

interface ArticleForm {
	id?: number;
	publicationName?: string;
	title?: string;
	url?: string;
	publishedDate?: string;
	content?: string;
	States?: State[];
}

export default function ApprovedChatGptPage() {
	const dispatch = useAppDispatch();
	const { stateArray = [] } = useAppSelector((state) => state.user);

	const [articleForm, setArticleForm] = useState<ArticleForm>({});

	return (
		<div className="flex flex-col gap-4 md:gap-6">
			{/* Summary Statistics */}
			<SummaryStatistics />

			<h1 className="text-title-xl text-gray-700 dark:text-gray-300">
				Approved ChatGPT Analysis
			</h1>

			{/* Form Section */}
			<div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="space-y-4">
					{/* Publication Name */}
					<div className="flex flex-col gap-2">
						<label
							htmlFor="publicationName"
							className="text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Publication Name:
						</label>
						<input
							id="publicationName"
							type="text"
							value={articleForm?.publicationName || ""}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white max-w-2xl"
							onChange={(e) =>
								setArticleForm({
									...articleForm,
									publicationName: e.target.value,
								})
							}
						/>
					</div>

					{/* Title */}
					<div className="flex flex-col gap-2">
						<label
							htmlFor="title"
							className="text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Title:
						</label>
						<input
							id="title"
							type="text"
							value={articleForm?.title || ""}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white max-w-2xl"
							onChange={(e) =>
								setArticleForm({ ...articleForm, title: e.target.value })
							}
						/>
					</div>

					{/* URL */}
					<div className="flex flex-col gap-2">
						<label
							htmlFor="url"
							className="text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							URL:
						</label>
						<input
							id="url"
							type="text"
							value={articleForm?.url || ""}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white max-w-2xl"
							onChange={(e) =>
								setArticleForm({ ...articleForm, url: e.target.value })
							}
						/>
					</div>

					{/* Published Date */}
					<div className="flex flex-col gap-2">
						<label
							htmlFor="publishedDate"
							className="text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Published Date:
						</label>
						<input
							id="publishedDate"
							type="date"
							value={articleForm?.publishedDate || ""}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white max-w-xs"
							onChange={(e) =>
								setArticleForm({ ...articleForm, publishedDate: e.target.value })
							}
						/>
					</div>

					{/* Article State */}
					<div className="flex flex-col gap-2">
						<div className="max-w-xs">
							<MultiSelect
								label="Article State"
								options={stateArray.map((state) => ({
									value: state.id.toString(),
									text: state.name,
									selected: state.selected,
								}))}
								defaultSelected={stateArray
									.filter((s) => s.selected)
									.map((s) => s.id.toString())}
								onChange={(selectedValues) => {
									const updated = stateArray.map((state) => ({
										...state,
										selected: selectedValues.includes(state.id.toString()),
									}));
									dispatch(updateStateArray(updated));
								}}
							/>
						</div>
					</div>

					{/* Content */}
					<div className="flex flex-col gap-2">
						<label
							htmlFor="content"
							className="text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Content:
						</label>
						<textarea
							id="content"
							value={articleForm?.content || ""}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white min-h-[200px]"
							onChange={(e) =>
								setArticleForm({
									...articleForm,
									content: e.target.value,
								})
							}
						/>
					</div>
				</div>
			</div>

			{/* Table Placeholder */}
			<div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
				<div className="text-center text-gray-700 dark:text-gray-300 py-8">
					TableApprovedArticlesChatGpt
				</div>
			</div>
		</div>
	);
}
