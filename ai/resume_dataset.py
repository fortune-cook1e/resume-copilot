from datasets import load_dataset
import pandas as pd
import re


def clean_text(text):
    if not isinstance(text, str):
        return ""
    # 使用简单的正则去除特殊符号
    # 只保留字母、数字、基础标点和空格
    text = re.sub(r'http\S+\s*', ' ', text)
    # 去除大部分特殊符号，保留必要的空格
    text = re.sub(r'[^\w\s,.?!\-\(\)]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# 合并属性
def combine_features(row):
    parts = []
    for col in feature_cols:
        val = row[col]
        
        # 1. 检查值是否有效（非空）
        if val is None:
            continue
            
        # 2. 如果是列表/数组，先将其合并为字符串
        if isinstance(val, (list, tuple)):
            # 过滤掉列表里的 None，然后用逗号拼接
            cleaned_list = [str(i) for i in val if i is not None]
            val_str = ", ".join(cleaned_list)
        else:
            # 如果是单个元素，直接转字符串
            val_str = str(val)
            
        # 3. 检查转换后的字符串是否只有空格或为空
        if val_str.strip():
            parts.append(val_str)
            
    return " ".join(parts)



# load local JD data
def load_local_jd(file_path):
    df_jd_local = pd.read_csv(file_path)
    
    # 预处理：将 Skills 字符串转为列表（方便后续比对）
    # 例如：'C#; ASP.NET' -> ['C#', 'ASP.NET']
    df_jd_local['skill_list'] = df_jd_local['Skills'].apply(
        lambda x: [i.strip() for i in str(x).split(';')] if pd.notna(x) else []
    )
    
    # 清洗 Responsibilities 文本
    df_jd_local['cleaned_resp'] = df_jd_local['Responsibilities'].apply(clean_text)
    
    return df_jd_local


# ------1. Data Preparation----
resume_ds = load_dataset("datasetmaster/resumes", split='train')
df_jd = load_local_jd('./datasets/job_dataset.csv')

df_resume = pd.DataFrame(resume_ds)


# print("\n简历数据集的原始列名:", df_resume.columns.tolist())

# important columns
feature_cols = ['experience', 'education', 'skills', 'projects', 'certifications','internships']

# 执行聚合
df_resume['combined_features'] = df_resume.apply(combine_features, axis=1)
df_resume['cleaned_combined_features'] = df_resume['combined_features'].apply(clean_text)

print("\nJD 数据集的列名:", df_resume.columns.tolist())
print("\nJD 数据集的列名:", df_jd.columns.tolist())
print(df_resume['cleaned_combined_features'].iloc[0])
# print(df_jd['cleaned_resp'].iloc[0])


